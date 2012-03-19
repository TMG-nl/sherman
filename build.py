from __future__ import with_statement
from builderror import BuildError
from optparse import OptionParser

import base64
import buildutil
import codecs
import distutils.dir_util
import imp
import os
import random
import shutil
import signal
import shermanfeature
import tempfile
import time

try:
    import json
except ImportError:
    import simplejson as json


builder = None


def onInterrupt(signum, frame):
    if not builder.config.buildDir:
        shutil.rmtree(builder.buildDir, ignore_errors = True)

    print "\nExit."
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
    parser.add_option("", "--simulate-high-latency", dest = "simulateHighLatency", action = "store_true",
                      help = "Simulates the effect of high network latency when serving")
    parser.add_option("", "--continuous-build", dest = "continuousBuild", action = "store_true",
                      help = "Keeps building the project continuously (warning: consumes a lot of CPU)")
    parser.add_option("", "--build-dir", dest = "buildDir",
                      help = "Specifies the directory to create the build in")

    (options, args) = parser.parse_args()

    class Config:
        projectManifest = None
        target = None
        serve = False
        port = 9090
        simulateHighLatency = False
        continuousBuild = False
        buildDir = ""

    config = Config()
    config.projectManifest = os.path.abspath(args[0] if len(args) >= 1 else "project-manifest.json")
    config.target = options.target

    if options.serve:
        config.serve = True

    config.port = options.port

    if options.simulateHighLatency:
        config.simulateHighLatency = True

    if options.continuousBuild:
        config.continuousBuild = True

    if options.buildDir:
        config.buildDir = options.buildDir

    return config


class ProjectBuilder(object):
    def __init__(self, config):
        self.shermanDir = os.path.abspath(os.path.dirname(__file__))
        self.projectDir = os.path.dirname(config.projectManifest)
        self.buildDir = config.buildDir or tempfile.mkdtemp(".build", "sherman.")

        self.config = config

        self.projectManifest = None
        self.locales = []
        self.target = None
        self.modules = []

        self.rebuildNeeded = False

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
            raise BuildError("Could not load manifest file %s" % self.config.projectManifest, exception)

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

        for feature in self.target["features"]:
            featureName = feature["name"]

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
                raise BuildError("Could not load feature %s" % featureName, error)
            except Exception, exception:
                raise BuildError("Exception while loading feature %s" % featureName, exception)
            finally:
                if f:
                    f.close()

            print "Enabled feature: %s" % featureName

    def invokeFeatures(self, hookName, *args):
        hooks = []
        for featureName in self.features:
            feature = self.features[featureName]
            if hookName in feature.__class__.__dict__:
                function = feature.__class__.__dict__[hookName]
            else:
                for base in feature.__class__.__bases__:
                    if hookName in base.__dict__:
                        function = base.__dict__[hookName]
                        break
            hooks.append((function.priority if "priority" in function.func_dict else shermanfeature.DEFAULT_PRIORITY,
                          featureName, (feature, function)))

        hooks = sorted(hooks, key = lambda hook: hook[0]) 

        for hook in hooks:
            (priority, featureName, (feature, function)) = hook
            try:
                function(feature, *args)
            except Exception, exception:
                raise BuildError("Exception in feature %s" % featureName, exception)

    def serve(self):
        if os.path.exists(self.projectDir + "/cgi-bin"):
            shutil.copytree(self.projectDir + "/cgi-bin", self.buildDir + "/cgi-bin")
        else:
            shutil.copytree(self.shermanDir + "/cgi-bin", self.buildDir + "/cgi-bin")
        os.system("chmod -R a+rwx " + self.buildDir)

        # set working directory as the CGIHTTPServer will only serve from current dir
        os.chdir(self.buildDir)

        random.seed()

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
                    if builder.config.simulateHighLatency:
                        time.sleep(0.2 + 2 * random.random())
                    CGIHTTPServer.CGIHTTPRequestHandler.do_GET(self)
                except BuildError, error:
                    error.printMessage()

                    self.wfile.write("<html>")
                    self.wfile.write("<body>")
                    self.wfile.write("<h1>Build Error</h1>")
                    self.wfile.write("<pre>%s</pre>" % str(error))
                    self.wfile.write("<p>(check console output for more info)</p>")
                    self.wfile.write("</body>")
                    self.wfile.write("</html>")

            def do_POST(self):
                if self.path == "/profile-dump":
                    length = int(self.headers.getheader("content-length"))
                    builder.features["profiling"].showProfileDump(self.rfile.read(length))
                else:
                    CGIHTTPServer.CGIHTTPRequestHandler.do_POST(self)

        print "Serving at http://localhost:%i/" % self.config.port
        httpd = BaseHTTPServer.HTTPServer(("0.0.0.0", self.config.port), ProjectServerRequestHandler)
        httpd.allow_reuse_address = True
        httpd.serve_forever()

    def continuousBuild(self):
        while True:
            self.build()
            time.sleep(1)

    def build(self):
        if not os.path.exists(self.buildDir):
            distutils.dir_util.mkpath(self.buildDir)

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

        self.invokeFeatures("modulesWritten")

        for locale in self.locales:
            bootHash = self.writeBootHtml(locale)

            self.writeVersionFile("__version__", locale, bootHash)

        self.invokeFeatures("buildFinished")

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

        defaultLocale = self.projectManifest["defaultLocale"]
        manifest = self.currentBuild.files[defaultLocale][moduleName]["__manifest__"]
        self.invokeFeatures("manifestLoaded", moduleName, modulePath, manifest)

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

        self.invokeFeatures("sourcesLoaded", locale, moduleName, modulePath)

    def isRebuildNeeded(self, locale, moduleName, modulePath):
        if self.rebuildNeeded:
            return True

        for featureName in self.features:
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

        self.invokeFeatures("sourcesConcatenated", locale, moduleName, modulePath)

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
        bootstrapCode = {
            "head": "",
            "body": "Application.init([config])",
            "tail": ""
        }
        self.invokeFeatures("generateBootstrapCode", locale, bootstrapCode)

        headJs = (
            "try{document.domain='%(domain)s'}catch(e){}"
            "function giveUp(e){var a=confirm('Het spijt me te moeten zeggen dat %(title)s niet kon opstarten. Zullen we het opnieuw proberen?');"
            r"if(a){window.location.reload()}else{document.body?document.body.innerHTML='<h1>'+e+'</h1><p><button onclick=\"window.location.reload()\">Verfrissen</button></p>':alert(e)}}"
            "try{"
            "%(head)s"
            "function go(){"
            "%(body)s"
            "}"
            "%(tail)s"
            "}catch(e){giveUp(e)}"
        ) % {
            "domain": self.projectManifest["domain"],
            "title": self.projectManifest["title"],
            "head": bootstrapCode["head"],
            "body": bootstrapCode["body"],
            "tail": bootstrapCode["tail"]
        }

        onloadJs = ("try{go()}catch(e){giveUp(e)}")

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
        elif config.continuousBuild:
            signal.signal(signal.SIGINT, onInterrupt)

            builder.continuousBuild()
        else:
            builder.build()
    except BuildError, error:
        error.printMessage()
        exit(1)
