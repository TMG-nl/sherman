projectDir = None
shermanDir = None
buildDir = None

def init(options):
    pass

def manifestLoaded(moduleName, modulePath, projectBuilder):
    pass

def sourcesLoaded(locale, moduleName, modulePath, projectBuilder):
    pass

def isRebuildNeeded(locale, moduleName, modulePath, projectBuilder):
    return False

def sourcesConcatenated(locale, moduleName, modulePath, projectBuilder):
    pass

def filesWritten(projectBuilder):
    pass
