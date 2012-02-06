import buildutil


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
    module = projectBuilder.currentBuild.files[locale][moduleName]

    bootNs = projectBuilder.currentBuild.files[locale]["boot"]["__manifest__"]["namespace"]

    js = buildutil.jsStringEscape(module["__concat__"])

    if moduleName == "boot":
        js = "try{%s.Modules.addModule(\"%s\",'%s')}catch(e){giveUp(e)}" % (bootNs, moduleName, js)
    else:
        js = "%s.Modules.addModule(\"%s\",'%s')" % (bootNs, moduleName, js)

    module["__concat__"] = js

def filesWritten(projectBuilder):
    pass
