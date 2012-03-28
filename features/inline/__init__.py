from builderror import BuildError
from shermanfeature import ShermanFeature


class Feature(ShermanFeature):

    @ShermanFeature.priority(10)
    def sourcesLoaded(self, locale, moduleName, modulePath):
        if moduleName != "boot":
            return

        bootModule = self.currentBuild.files[locale]["boot"]
        if "inline" in self.currentBuild.files[locale]:
            inlineModule = self.currentBuild.files[locale]["inline"]
        else:
            inlineModule = {
                "__manifest__": {
                     "namespace": bootModule["__manifest__"]["namespace"],
                     "dependencies": [],
                     "sources": []
                }
            }
            for l in self.projectBuilder.locales:
                self.currentBuild.files[l]["inline"] = inlineModule

        for source in bootModule["__manifest__"]["sources"]:
            if "inline" in source and source["inline"] == True:
                path = self.projectBuilder.resolveFile(source["path"], modulePath + "/js")
                if bootModule[path] == "":
                    continue # already moved

                inlineModule[path] = bootModule[path]
                bootModule[path] = ""

                if not source in inlineModule["__manifest__"]["sources"]:
                    inlineModule["__manifest__"]["sources"].append(source)

        self.projectBuilder.invokeFeatures("sourcesLoaded", locale, "inline", modulePath)

        self.projectBuilder.concatenateSources(locale, "inline", modulePath)

    @ShermanFeature.priority(60)
    def generateBootstrapCode(self, locale, bootstrapCode):
        bootstrapCode["head"] = (
            "%(inlineJs)s"
            "%(head)s"
        ) % {
            "inlineJs": self.currentBuild.files[locale]["inline"]["__concat__"],            
            "head": bootstrapCode["head"]
        }
