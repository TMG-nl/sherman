import buildutil
import os


projectDir = None
shermanDir = None
buildDir = None


timestamps = {}
staticMap = {}

rebuildNeeded = False

def init(options):
    pass

def manifestLoaded(moduleName, modulePath, projectBuilder):
    pass

def sourcesLoaded(locale, moduleName, modulePath, projectBuilder):
    global timestamps, staticMap
    global rebuildNeeded
    rebuildNeeded = False

    print "    Copying statics..."

    for static in module["__manifest__"]["statics"]:
        path = os.path.abspath("statics/" + static["path"])
        mtime = os.stat(path).st_mtime
        if path in self.timestamps and mtime == self.timestamps[key]:
            continue

        print "      %s..." % path[8:]

        self.timestamps[key] = mtime

        (directory, fileName) = os.path.split(path)
        (baseName, extension) = os.path.splitext(fileName)
        with open(modulePath + "/" + path, "r") as inFile:
            content = inFile.read()

        destFileName = buildutil.getDestinationFileName(moduleName, baseName, content, None, extension)
        destPath = projectBuilder.buildDir + "/" + destFileName
        if not os.path.exists(destPath): # avoid multiple locales copying the same file
            with open(destPath, "w") as outFile:
                outFile.write(content)

        staticMap[path] = destFileName

def isRebuildNeeded(locale, moduleName, modulePath, projectBuilder):
    global rebuildNeeded
    return rebuildNeeded

def sourcesConcatenated(locale, moduleName, modulePath, projectBuilder):
    global staticMap

    if len(staticMap) > 0:
        module = projectBuilder.currentBuild.files[locale][moduleName]

        staticDefs = []
        for path in staticMap:
            staticDefs.append("\"%s\": \"%s\"" % (path, staticMap[path]))
        module["__concat__"] += "Modules.%s.statics = { %s };\n" % (moduleName, ", ".join(staticDefs))

def filesWritten(projectBuilder):
    pass
