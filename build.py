from __future__ import with_statement
from builderror import BuildError
from optparse import OptionParser

import base64
import buildutil
import codecs
import imp
import inspect
import logging
import os
import shutil
import signal
import shermanfeature
import tempfile

try:
    import json
except ImportError:
    import simplejson as json


logging.basicConfig(level = logging.DEBUG)


def onInterrupt(signum, frame):
    print "Exit."
    exit()


def parseOptions():
    usage = "Usage: %prog [options] [<project_manifest>]"
    parser = OptionParser(usage = usage)
    parser.add_option("", "--target", dest = "target", default = "distribution",
                      help = "Selects the target to build")
    parser.add_option("", "--serve", action = "store_true",
                      help = "Serve the project from the built-in webserver on localhost")
    parser.add_option("", "--port", dest = "port",
                      default = 9090, type = "int",
                      help = "The port on which to run the built-in webserver")

    (options, args) = parser.parse_args()

    class Config:
        projectManifest = None
        target = None
        serve = False
        port = 9090

    config = Config()
    config.projectManifest = os.path.abspath(args[0] if len(args) >= 1 else "project-manifest.json")
    config.target = options.target

    if options.serve:
        config.serve = True

    config.port = options.port

    return config


class ProjectBuilder(object):
    def __init__(self, config):
        self.shermanDir = os.path.abspath(os.path.dirname(__file__))
        self.projectDir = os.path.dirname(config.projectManifest)
        self.buildDir = tempfile.mkdtemp(".build", "sherman.")

        self.config = config
        self.verbose = True

        self.projectManifest = None
        self.locales = []
        self.target = None
        self.modules = []

        self.rebuildNeeded = False

        self.featureList = []
        self.features = {}

        class ModifiedFiles(object):
            def __init__(self):
                self.timestamps = {}

            def read(self, locale, path):
                path = os.path.abspath(path)
                key = locale + ":" + path
                mtime = os.stat(path).st_mtime
                if key in self.timestamps and mtime == self.timestamps[key]:
                    return False
                self.timestamps[key] = mtime
                with codecs.open(path, "r", "utf-8") as f:
                    return f.read()

        self.modifiedFiles = ModifiedFiles()

        class Build(object):
            # locale => {
            #     module => {
            #         filename => content,
            #         "__concat__" => content,
            #         "__manifest__" => object,
            #         "__output__" => [ filename, ... ]
            #     }
            # }
            files = {}

        self.currentBuild = Build()

        self.loadProjectManifest()

    def log(self, message, level = logging.INFO):
        if self.verbose or level >= logging.WARN:
            logging.log(level, message)

    def resolveFile(self, path, directory = ""):
        if path[0] == "/":
            if os.path.exists(self.projectDir + path):
                return self.projectDir + path
            elif os.path.exists(self.shermanDir + path):
                return self.shermanDir + path
        else:
            if os.path.exists(directory + "/" + path):
                return directory + "/" + path
        raise BuildError("Missing resource: %s" % path)

    def loadProjectManifest(self):
        try:
            with open(self.config.projectManifest, "r") as f:
                contents = f.read()

            self.projectManifest = json.loads(contents)
        except Exception, exception:
            raise BuildError("Could not load manifest file %s: %s" % (self.config.projectManifest, str(exception)))

        if not "locales" in self.projectManifest or len(self.projectManifest["locales"]) == 0:
            raise BuildError("No locales defined in manifest file %s" % self.config.projectManifest)
        if not "defaultLocale" in self.projectManifest:
            raise BuildError("No default locale defined in manifest file %s" % self.config.projectManifest)
        if not self.projectManifest["defaultLocale"] in self.projectManifest["locales"]:
            raise BuildError("Default locale not defined among locales in manifest file %s" % self.config.projectManifest)

        self.locales = self.projectManifest["locales"]

        if not self.config.target in self.projectManifest["targets"]:
            raise BuildError("No target %s defined in manifest file %s" % (self.config.target, self.config.projectManifest))

        self.target = self.projectManifest["targets"][self.config.target]

        if "modules" in self.target:
            self.modules = self.target["modules"]
        else:
            if not "modules" in self.projectManifest:
                raise BuildError("No modules defined in manifest file %s for target %s" % (self.config.projectManifest, self.config.target))
            self.modules = self.projectManifest["modules"]

        if "options" in self.target:
            if "fileNamePattern" in self.target["options"]:
                buildutil.fileNamePattern = self.target["options"]["fileNamePattern"]

    def loadFeatures(self):
        if not "features" in self.target:
            raise BuildError("No features defined in manifest file %s for target %s" % (self.config.projectManifest, self.config.target))

        paths = [self.projectDir + "/features", self.shermanDir + "/features"]

        self.featureList = []
        for feature in self.target["features"]:
            featureName = feature["name"]
            self.featureList.append(featureName)

            if featureName in self.features:
                continue # already loaded

            try:
                f = None
                (f, path, description) = imp.find_module(featureName, paths)

                module = imp.load_module(featureName, f, path, description)
                self.features[featureName] = module.Feature(shermanfeature.Options(
                    projectDir = self.projectDir,
                    shermanDir = self.shermanDir,
                    buildDir = self.buildDir,
                    projectBuilder = self,
                    featureOptions = feature["options"] if "options" in feature else {}
                ))

            except ImportError, error:
                raise BuildError("Could not load feature %s" % featureName, str(error))
            except Exception, exception:
                raise BuildError("Exception while loading feature %s" % featureName, str(exception))
            finally:
                if f:
                    f.close()

            print "Enabled feature: %s" % featureName

    def serve(self):
        self.verbose = False

        if os.path.exists(self.projectDir + "/cgi-bin"):
            shutil.copytree(self.projectDir + "/cgi-bin", self.buildDir + "/cgi-bin")
        else:
            shutil.copytree(self.shermanDir + "/cgi-bin", self.buildDir + "/cgi-bin")
        os.system("chmod -R a+rwx " + self.buildDir)

        # set working directory as the CGIHTTPServer will only serve from current dir
        os.chdir(self.buildDir)

        import BaseHTTPServer
        import CGIHTTPServer

        builder = self
        class ProjectServerRequestHandler(CGIHTTPServer.CGIHTTPRequestHandler):
            def do_GET(self):
                try:
                    search = ""
                    path = self.path
                    qi = path.find("?")
                    if qi > -1:
                        search = path[qi:]
                        path = path[0:qi]
                    if path == "/":
                        self.path = "/cgi-bin/index.py" + search
                        builder.loadProjectManifest()
                        shutil.copy(builder.config.projectManifest, builder.buildDir)
                        builder.build()
                    CGIHTTPServer.CGIHTTPRequestHandler.do_GET(self)
                except BuildError, error:
                    message = str(error)
                    if error.originalException:
                        message += ": " + str(error.originalException)

                    self.wfile.write("<html>")
                    self.wfile.write("<body>")
                    self.wfile.write("<h1>Build Error</h1>")
                    self.wfile.write("<pre>%s</pre>" % message)
                    self.wfile.write("<p>(check console output for more info)</p>")
                    self.wfile.write("</body>")
                    self.wfile.write("</html>")

                    print message
                    if error.originalTrace:
                        print "Traceback (most recent call last):"
                        for frame in error.originalTrace:
                            print "  File \"%s\", line %s, in %s" % (frame[1], frame[2], frame[3])

        print "Serving at http://localhost:%i/" % self.config.port
        httpd = BaseHTTPServer.HTTPServer(("0.0.0.0", self.config.port), ProjectServerRequestHandler)
        httpd.allow_reuse_address = True
        httpd.serve_forever()

    def build(self):
        self.loadFeatures()

        for locale in self.locales:
            if not locale in self.currentBuild.files:
                self.currentBuild.files[locale] = {}
            for module in self.modules:
                moduleName = module["name"]
                if not moduleName in self.currentBuild.files[locale]:
                    self.currentBuild.files[locale][moduleName] = {}
                self.currentBuild.files[locale][moduleName]["__built__"] = False

        for module in self.modules:
            self.buildModule(module["name"])

        for featureName in self.featureList:
            try:
                self.features[featureName].filesWritten()
            except Exception, exception:
                raise BuildError("Exception in feature %s" % featureName, exception)

        for locale in self.locales:
            bootHash = self.writeBootHtml(locale)

            self.writeVersionFile("__version__", locale, bootHash)

        print "Done."

    def buildModule(self, moduleName):
        defaultLocale = self.projectManifest["defaultLocale"]

        if self.currentBuild.files[defaultLocale][moduleName]["__built__"]:
            return # module already built

        self.currentBuild.files[defaultLocale][moduleName]["__built__"] = True

        if os.path.exists(self.projectDir + "/modules/" + moduleName):
            modulePath = self.projectDir + "/modules/" + moduleName
        elif os.path.exists(self.shermanDir + "/modules/" + moduleName):
            modulePath = self.shermanDir + "/modules/" + moduleName
        else:
            raise BuildError("Could not find module %s" % moduleName)

        self.loadModuleManifest(moduleName, modulePath)

        # make sure dependencies are built before the module itself
        for prerequisite in self.currentBuild.files[defaultLocale][moduleName]["__manifest__"]["dependencies"]:
            self.buildModule(prerequisite)

        print "Building module %s..." % moduleName 

        for featureName in self.featureList:
            try:
                defaultLocale = self.projectManifest["defaultLocale"]
                manifest = self.currentBuild.files[defaultLocale][moduleName]["__manifest__"]
                self.features[featureName].manifestLoaded(moduleName, modulePath, manifest)
            except Exception, exception:
                raise BuildError("Exception in feature %s" % featureName, exception)

        for locale in self.locales:
            print "  Processing locale %s..." % locale

            self.loadSources(locale, moduleName, modulePath)

            if self.isRebuildNeeded(locale, moduleName, modulePath):
                self.removeOldFiles(locale, moduleName, modulePath)

                self.concatenateSources(locale, moduleName, modulePath)

                self.writeFiles(locale, moduleName, modulePath)

    def loadModuleManifest(self, moduleName, modulePath):
        try:
            contents = self.modifiedFiles.read("*", modulePath + "/manifest.json")
            if contents:
                manifest = json.loads(contents)
                for locale in self.locales:
                    self.currentBuild.files[locale][moduleName]["__manifest__"] = manifest

                if not "dependencies" in manifest:
                    raise BuildError("No dependencies specified for module %s" % moduleName)
        except Exception, exception:
            raise BuildError("Could not load manifest for module %s" % moduleName, exception)

    def loadSources(self, locale, moduleName, modulePath):
        module = self.currentBuild.files[locale][moduleName]

        try:
            self.rebuildNeeded = False

            for source in module["__manifest__"]["sources"]:
                path = self.resolveFile(source["path"], modulePath + "/js")
                contents = self.modifiedFiles.read(locale, path)
                if contents:
                    module[path] = contents
                    self.rebuildNeeded = True
        except Exception, exception:
            raise BuildError("Could not load sources for module %s" % moduleName, exception)

        if self.rebuildNeeded:
            print "    Loaded JavaScript..."

        for featureName in self.featureList:
            try:
                self.features[featureName].sourcesLoaded(locale, moduleName, modulePath)
            except Exception, exception:
                raise BuildError("Exception in feature %s" % featureName, exception)

    def isRebuildNeeded(self, locale, moduleName, modulePath):
        if self.rebuildNeeded:
            return True

        for featureName in self.featureList:
            try:
                if self.features[featureName].isRebuildNeeded(locale, moduleName, modulePath):
                    return True
            except Exception, exception:
                raise BuildError("Exception in feature %s" % featureName, exception)

        return False

    def removeOldFiles(self, locale, moduleName, modulePath):
        module = self.currentBuild.files[locale][moduleName]

        if "__output__" in module:
            for filename in module["__output__"]:
                os.unlink(self.buildDir + "/" + filename)

        module["__output__"] = []

    def concatenateSources(self, locale, moduleName, modulePath):
        module = self.currentBuild.files[locale][moduleName]

        try:
            print "    Concatenating sources..."

            concat = ""
            for source in module["__manifest__"]["sources"]:
                path = self.resolveFile(source["path"], modulePath + "/js")
                content = module[path].strip()
                if len(content) > 0:
                    content += ("\n" if content[-1] == ";" else ";\n")
                concat += content
            module["__concat__"] = concat
        except Exception, exception:
            raise BuildError("Could not concatenate sources for module %s" % moduleName, exception)

        for featureName in self.featureList:
            try:
                self.features[featureName].sourcesConcatenated(locale, moduleName, modulePath)
            except Exception, exception:
                raise BuildError("Exception in feature %s" % featureName, exception)

    def writeFiles(self, locale, moduleName, modulePath):
        print "    Writing output file..."

        module = self.currentBuild.files[locale][moduleName]

        try:
            contents = module["__concat__"]
            filename = buildutil.getDestinationFileName(moduleName, None, contents, locale, "js")
            with codecs.open(self.buildDir + "/" + filename, "w", "utf-8") as f:
                f.write(contents)
            module["__output__"].append(filename)
        except Exception, exception:
            raise BuildError("Could not write output file for module %s" % moduleName, exception)

    def writeBootHtml(self, locale):
        bootNs = self.currentBuild.files[locale]["boot"]["__manifest__"]["namespace"]
        coreNs = self.currentBuild.files[locale]["core"]["__manifest__"]["namespace"]
        if bootNs == coreNs:
            coreNsPrefix = ""
        else:
            coreNsPrefix = coreNs + "."

        resources = {}
        for module in self.modules:
            moduleName = module["name"]
            module = self.currentBuild.files[locale][moduleName]

            jsFileName = None
            for fileName in module["__output__"]:
                if fileName.endswith(".js"):
                    jsFileName = fileName
            if not jsFileName:
                raise BuildError("Module %s did not generate a JavaScript output file" % moduleName)

            resources[moduleName] = {}
            resources[moduleName][locale] = jsFileName
            resources[moduleName]["dependencies"] = module["__manifest__"]["dependencies"]

            if "essential" in module["__manifest__"] and module["__manifest__"]["essential"]:
                resources[moduleName]["essential"] = True

        headJs = (
            "try{document.domain='%(domain)s'}catch(e){}"
            "function giveUp(e){var a=confirm('Het spijt me te moeten zeggen dat %(title)s niet kon opstarten. Zullen we het opnieuw proberen?');"
            r"if(a){window.location.reload()}else{document.body.innerHTML='<h1>'+e+'</h1><p><button onclick=\"window.location.reload()\">Verfrissen</button></p>'}}"
            "try{"
            "var %(bootNs)s=%(bootNs)s||{};"
            "with(%(bootNs)s){"
            "%(inlineJs)s"
            "%(bootNs)s.go=function(){"
            "Modules.config(\"[static_base]\",\"%(locale)s\",%(resources)s);"
            "Modules.load([\"boot\",\"core\"]).then(function(){"
            "%(coreNsPrefix)sApplication.init([config])"
            "})"
            "}"
            "}"
            "}catch(e){giveUp(e)}"
        ) % {
            "domain": self.projectManifest["domain"],
            "title": self.projectManifest["title"],
            "bootNs": bootNs,
            "inlineJs": self.currentBuild.files[locale]["inline"]["__concat__"],
            "coreNsPrefix": coreNsPrefix,
            "locale": locale,
            "resources": json.dumps(resources).replace(" ", "")
        }

        onloadJs = "try{%s.go()}catch(e){giveUp(e)}" % bootNs

        # icing on the cake, include your favorite icon in the HTML
        favicon = buildutil.base64EncodeImage(self.projectDir + "/boot/favicon.ico")

        with open(self.projectDir + "/boot/boot.tpl.html") as f:
            bootHtml = f.read() % {
                "favicon": favicon,
                "headJs": headJs,
                "onloadJs": onloadJs
            }

        filename = buildutil.getDestinationFileName("boot", None, bootHtml, locale, "html")
        with codecs.open(self.buildDir + "/" + filename, "w", "utf-8") as f:
            f.write(bootHtml)

        return buildutil.getContentHash(bootHtml)

    def writeVersionFile(self, name, locale, hash):
        filename = buildutil.getDestinationFileName(name, None, None, locale, "md5")
        with open(self.buildDir + "/" + filename, "w") as f:
            f.write(hash)


if __name__ == "__main__":
    os.stat_float_times(True)

    config = parseOptions()

    try:
        builder = ProjectBuilder(config)

        if config.serve:
            signal.signal(signal.SIGINT, onInterrupt)

            builder.serve()
        else:
            builder.build()
    except BuildError, error:
        print "Build Error: " + str(error)
