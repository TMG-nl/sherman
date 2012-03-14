from __future__ import with_statement
from builderror import BuildError
from shermanfeature import ShermanFeature

import buildutil
import codecs
import copy
import os

try:
    import json
except ImportError:
    import simplejson as json


class Feature(ShermanFeature):

    def manifestLoaded(self, moduleName, modulePath, manifest):
        if moduleName != "boot":
            return

        # make a copy of boot, as the boot module will not contain all sources
        # when used in combination with the inline feature
        for locale in self.projectBuilder.locales:
            self.currentBuild.files[locale]["boot-full"] = {
                "__manifest__": copy.deepcopy(manifest),
                "__built__": False
            }

    def modulesWritten(self):
        self.buildFullBootModule()

        for locale in self.projectBuilder.locales:
            resources = {}
            bootScripts = []
            for module in self.projectBuilder.modules:
                moduleName = module["name"]
                if moduleName == "inline":
                    continue

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
                if moduleName == "boot":
                    bootScripts.append("[static_base]/" + jsFileName)
                if "essential" in module["__manifest__"] and module["__manifest__"]["essential"]:
                    resources[moduleName]["essential"] = True

            bootJson = {
                "bootscripts": bootScripts,
                "resources": resources,
                "locale": locale,
                "baseurl": "[static_base]/",
                "config": "[config]"
            }

            if "tiles" in self.projectBuilder.features:
                bootJson["tileModuleDependencies"] = self.projectBuilder.features["tiles"].tileModuleDependencies

            bootJson = json.dumps(bootJson)

            fileName = buildutil.getDestinationFileName("boot", None, bootJson, locale, "json")
            with codecs.open(self.buildDir + "/" + fileName, "w", "utf-8") as f:
                f.write(bootJson)

            bootHash = buildutil.getContentHash(bootJson)
            self.writeVersionFile("__versionjson__", locale, bootHash)

        self.reinstateBootModule()

    def buildFullBootModule(self):
        if not "inline" in self.projectBuilder.features:
            return

        print "Disabling inline feature to generate JSON index..."

        inlineFeature = self.projectBuilder.features["inline"]
        del self.projectBuilder.features["inline"]

        for locale in self.projectBuilder.locales:
            self.currentBuild.files[locale]["boot-inline"] = self.currentBuild.files[locale]["boot"]
            self.currentBuild.files[locale]["boot"] = self.currentBuild.files[locale]["boot-full"]

        originalLoadSources = self.projectBuilder.loadSources

        def loadSources(locale, moduleName, modulePath):
            module = self.currentBuild.files[locale][moduleName]

            self.projectBuilder.rebuildNeeded = True

            for source in module["__manifest__"]["sources"]:
                path = self.projectBuilder.resolveFile(source["path"], modulePath + "/js")
                if path in self.currentBuild.files[locale]["boot-inline"]:
                    module[path] = self.currentBuild.files[locale]["boot-inline"][path]
                else:
                    module[path] = self.currentBuild.files[locale]["inline"][path]

        self.projectBuilder.loadSources = loadSources

        self.projectBuilder.buildModule("boot")

        self.projectBuilder.loadSources = originalLoadSources

        self.projectBuilder.features["inline"] = inlineFeature

    def reinstateBootModule(self):
        if not "inline" in self.projectBuilder.features:
            return

        for locale in self.projectBuilder.locales:
            self.currentBuild.files[locale]["boot"] = self.currentBuild.files[locale]["boot-inline"]

    def writeVersionFile(self, name, locale, hash):
        filename = buildutil.getDestinationFileName(name, None, None, locale, "md5")
        with open(self.buildDir + "/" + filename, "w") as f:
            f.write(hash)
