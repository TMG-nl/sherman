from __future__ import with_statement
from builderror import BuildError
from optparse import OptionParser

import base64
import buildutil
import codecs
import imp
import logging
import os
import shutil
import signal
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
        self.shermanDir = os.path.dirname(__file__)
        self.projectDir = os.path.dirname(config.projectManifest)
        self.buildDir = tempfile.mkdtemp(".build", "sherman.")

        self.config = config
        self.verbose = True

        self.projectManifest = None
        self.locales = []
        self.target = None
        self.modules = []

        self.rebuildNeeded = False

        self.plugins = {}

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

    def loadPlugins(self):
        paths = [self.projectDir + "/plugins", self.shermanDir + "/plugins"]

        for plugin in self.target["plugins"]:
            pluginName = plugin["name"]
            if pluginName in self.plugins:
                continue # already loaded

            try:
                f = None
                (f, path, description) = imp.find_module(pluginName, paths)

                module = imp.load_module(pluginName, f, path, description)
                module.projectDir = self.projectDir
                module.shermanDir = self.shermanDir
                module.buildDir = self.buildDir
                module.init(plugin["options"] if "options" in plugin else {})

                self.plugins[pluginName] = module
            except ImportError, error:
                raise BuildError("Could not load plugin %s: %s" % (pluginName, str(error)))
            except Exception, exception:
                raise BuildError("Exception while loading plugin %s: %s" % (pluginName, str(exception)))
            finally:
                if f:
                    f.close()

    def serve(self):
        self.verbose = False

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
                    if self.path == "/":
                        self.path = "/cgi-bin/index.py"
                        builder.loadProjectManifest()
                        shutil.copy(builder.config.projectManifest, builder.buildDir)
                        builder.build()
                    CGIHTTPServer.CGIHTTPRequestHandler.do_GET(self)
                except BuildError, error:
                    self.wfile.write("Content-Type: text/html")
                    self.wfile.write("")
                    self.wfile.write("<html>")
                    self.wfile.write("<body>")
                    self.wfile.write("<h1>Build Error</h1>")
                    self.wfile.write("<pre>%s</pre>" % str(error))
                    self.wfile.write("<p>(check console output for more info)</p>")
                    self.wfile.write("</body>")
                    self.wfile.write("</html>")

        print "Serving at http://localhost:%i/" % self.config.port
        httpd = BaseHTTPServer.HTTPServer(("0.0.0.0", self.config.port), ProjectServerRequestHandler)
        httpd.allow_reuse_address = True
        httpd.serve_forever()        

    def build(self):
        self.loadPlugins()

        rebuildDone = False

        for locale in self.locales:
            if not locale in self.currentBuild.files:
                self.currentBuild.files[locale] = {}
            for module in self.modules:
                if not module["name"] in self.currentBuild.files[locale]:
                    self.currentBuild.files[locale][module["name"]] = {}

        for module in self.modules:
            moduleName = module["name"]
            print "Building module %s..." % moduleName 

            if os.path.exists(self.projectDir + "/modules/" + moduleName):
                modulePath = self.projectDir + "/modules/" + moduleName
            elif os.path.exists(self.shermanDir + "/modules/" + moduleName):
                modulePath = self.shermanDir + "/modules/" + moduleName
            else:
                raise BuildError("Could not find module %s" % moduleName)

            self.loadModuleManifest(moduleName, modulePath)

            for locale in self.locales:
                print "  Processing locale %s..." % locale

                self.loadSources(locale, moduleName, modulePath)

                if self.isRebuildNeeded(locale, moduleName, modulePath):
                    self.removeOldFiles(locale, moduleName, modulePath)

                    self.concatenateSources(locale, moduleName, modulePath)

                    self.writeFiles(locale, moduleName, modulePath)

                    rebuildDone = True

        if rebuildDone:
            for pluginName in self.plugins:
                self.plugins[pluginName].filesWritten(self)
        
        print "Done."

    def loadModuleManifest(self, moduleName, modulePath):
        try:
            contents = self.modifiedFiles.read("*", modulePath + "/manifest.json")
            if contents:
                manifest = json.loads(contents)
                for locale in self.locales:
                    self.currentBuild.files[locale][moduleName]["__manifest__"] = manifest
        except Exception, exception:
            raise BuildError("Could not load manifest for module %s: %s" % (moduleName, str(exception)))

        for pluginName in self.plugins:
            self.plugins[pluginName].manifestLoaded(moduleName, modulePath, self)

    def loadSources(self, locale, moduleName, modulePath):
        print "    Loading JavaScript..."

        module = self.currentBuild.files[locale][moduleName]

        try:
            self.rebuildNeeded = False

            for source in module["__manifest__"]["sources"]:
                path = "js/" + source["path"]
                contents = self.modifiedFiles.read(locale, modulePath + "/" + path)
                if contents:
                    module[path] = contents
                    self.rebuildNeeded = True
        except Exception, exception:
            raise BuildError("Could not load sources for module %s: %s" % (moduleName, str(exception)))

        for pluginName in self.plugins:
            self.plugins[pluginName].sourcesLoaded(locale, moduleName, modulePath, self)

    def isRebuildNeeded(self, locale, moduleName, modulePath):
        if self.rebuildNeeded:
            return True

        for pluginName in self.plugins:
            if self.plugins[pluginName].isRebuildNeeded(locale, moduleName, modulePath, self):
                return True

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
            concat = ""
            for filename in module:
                if filename[0:3] == "js/":
                    content = module[filename].strip()
                    if len(content) > 0:
                        content += ("\n" if content[-1] == ";" else ";\n")
                    concat += content
            module["__concat__"] = concat
        except Exception, exception:
            raise BuildError("Could not concatenate sources for module %s: %s" % (moduleName, str(exception)))

        for pluginName in self.plugins:
            self.plugins[pluginName].sourcesConcatenated(locale, moduleName, modulePath, self)

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
            raise BuildError("Could not write output file for module %s: %s" % (moduleName, str(exception)))


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
