from shermanfeature import ShermanFeature

import buildutil

try:
    import json
except ImportError:
    import simplejson as json


class Feature(ShermanFeature):

    def __init__(self, options):
        ShermanFeature.__init__(self, options)

        self.projectBuilder.features["modules-helper"] = HelperFeature(options)

        self.additionalBootResources.append({
            "path": "/features/modules/modules.js",
            "inline": True
        })

    @ShermanFeature.priority(100)
    def sourcesConcatenated(self, locale, moduleName, modulePath):
        if moduleName == "inline":
            return

        module = self.currentBuild.files[locale][moduleName]

        bootNs = self.currentBuild.files[locale]["boot"]["__manifest__"]["namespace"]

        js = module["__concat__"]

        doStringify = ((not "stringify" in self.options or self.options["stringify"]) and
                       not (moduleName == "boot" and not "inline" in self.projectBuilder.features)) 

        if doStringify:
            if moduleName == "boot":
                js = "try{%s.Modules.addModule(\"%s\",'%s')}catch(e){giveUp(e)}" % (bootNs, moduleName, buildutil.jsStringEscape(js))
            else:
                js = "%s.Modules.addModule(\"%s\",'%s')" % (bootNs, moduleName, buildutil.jsStringEscape(js))
        else:
            js += "%s.Modules.enableModule(\"%s\")" % (bootNs, moduleName)

        module["__concat__"] = js

    @ShermanFeature.priority(10)
    def generateBootstrapCode(self, locale, bootstrapCode):
        if "core" in self.currentBuild.files[locale]:
            initModules = "[\"boot\",\"core\"]"
        else:
            # there is no core module, so assume we can
            # fit it all into a single boot module
            initModules = "\"boot\""

        resources = {}
        for module in self.projectBuilder.modules:
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

        resources = json.dumps(resources).replace(", ", ",").replace(": ", ":")
        bootstrapCode["body"] = (
            "Modules.config(\"[static_base]\",\"%(locale)s\",%(resources)s);"
            "Modules.load(%(initModules)s).then(function(){"
            "%(body)s"
            "})"
        ) % {
           "locale": locale,
           "resources": resources,
           "initModules": initModules,
           "body": bootstrapCode["body"]
        }


class HelperFeature(ShermanFeature):

    @ShermanFeature.priority(70)
    def sourcesConcatenated(self, locale, moduleName, modulePath):
        if moduleName == "boot" or moduleName == "inline":
            return

        module = self.currentBuild.files[locale][moduleName]
        module["__concat__"] = ("Modules.%s = {};\n"
                                "%s" % (moduleName, module["__concat__"]))
