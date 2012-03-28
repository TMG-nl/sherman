
DEFAULT_PRIORITY = 50


class Options:

    def __init__(self, projectDir = None, shermanDir = None, buildDir = None, projectBuilder = None, featureOptions = None):
        self.projectDir = projectDir
        self.shermanDir = shermanDir
        self.buildDir = buildDir
        self.projectBuilder = projectBuilder
        self.featureOptions = featureOptions


class ShermanFeature(object):

    def __init__(self, options):
        self.projectDir = options.projectDir
        self.shermanDir = options.shermanDir
        self.buildDir = options.buildDir
        self.projectBuilder = options.projectBuilder
        self.currentBuild = self.projectBuilder.currentBuild
        self.options = options.featureOptions

        self.additionalBootResources = []

    def manifestLoaded(self, moduleName, modulePath, manifest):
        if moduleName != "boot":
            return

        insertIndex = 0
        for resource in self.additionalBootResources:
            included = False
            for source in manifest["sources"]:
                if source["path"] == "async.js" and insertIndex == 0:
                    insertIndex = manifest["sources"].index(source) + 1
                if source["path"].endswith(resource["path"]):
                    included = True
                    break
            if not included:
                manifest["sources"].insert(insertIndex, resource)
                insertIndex += 1

    def sourcesLoaded(self, locale, moduleName, modulePath):
        pass

    def isRebuildNeeded(self, locale, moduleName, modulePath):
        return False

    def sourcesConcatenated(self, locale, moduleName, modulePath):
        pass

    def modulesWritten(self):
        pass

    def generateBootstrapCode(self, locale, bootstrapCode):
        return bootstrapCode

    def buildFinished(self):
        pass

    @staticmethod
    def priority(prio):
        def setPriority(func):
            func.priority = prio
            return func
        return setPriority
