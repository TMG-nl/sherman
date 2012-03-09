
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

    def manifestLoaded(self, moduleName, modulePath, manifest):
        pass

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
