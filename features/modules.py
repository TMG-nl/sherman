from shermanfeature import ShermanFeature

import buildutil


class Feature(ShermanFeature):

    def manifestLoaded(self, moduleName, modulePath, manifest):
        if moduleName != "boot":
            return

        modulesIncluded = False
        for source in manifest["sources"]:
            if source["path"].endswith("modules/modules.js"):
                modulesIncluded = True

        defaultLocale = self.projectBuilder.projectManifest["defaultLocale"]
        if not modulesIncluded and "inline" in self.currentBuild.files[defaultLocale]:
            for source in self.currentBuild.files[defaultLocale]["inline"]["__manifest__"]["sources"]:
                if source["path"].endswith("modules/modules.js"):
                    modulesIncluded = True

        if not modulesIncluded:
            manifest["sources"].append({
                "path": "/features/modules/modules.js",
                "inline": True
            })

    def sourcesConcatenated(self, locale, moduleName, modulePath):
        if moduleName == "inline":
            return

        module = self.currentBuild.files[locale][moduleName]

        bootNs = self.currentBuild.files[locale]["boot"]["__manifest__"]["namespace"]

        js = module["__concat__"]

        if not "stringify" in self.options or self.options["stringify"]:
            if moduleName == "boot":
                js = "try{%s.Modules.addModule(\"%s\",'%s')}catch(e){giveUp(e)}" % (bootNs, moduleName, buildutil.jsStringEscape(js))
            else:
                js = "%s.Modules.addModule(\"%s\",'%s')" % (bootNs, moduleName, buildutil.jsStringEscape(js))
        else:
            js += "%s.Modules.enableModule(\"%s\")" % (bootNs, moduleName)

        module["__concat__"] = js
