from builderror import BuildError
from shermanfeature import ShermanFeature


class Feature(ShermanFeature):

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

        movedSources = []
        for source in bootModule["__manifest__"]["sources"]:
            if "inline" in source and source["inline"] == True:
                path = self.projectBuilder.resolveFile(source["path"], modulePath + "/js")
                inlineModule[path] = bootModule[path]
                del bootModule[path]

                inlineModule["__manifest__"]["sources"].append(source)
                movedSources.append(source)
        for source in movedSources:
            bootModule["__manifest__"]["sources"].remove(source)

        for featureName in self.projectBuilder.featureList:
            try:
                self.projectBuilder.features[featureName].sourcesLoaded(locale, "inline", modulePath)
            except Exception, exception:
                raise BuildError("Exception in feature %s" % featureName, exception)

        self.projectBuilder.concatenateSources(locale, "inline", modulePath)
