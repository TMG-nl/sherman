from shermanfeature import ShermanFeature

import buildutil
import os


class Feature(ShermanFeature):

    timestamps = {}
    staticMap = {}

    rebuildNeeded = False

    def sourcesLoaded(self, locale, moduleName, modulePath):
        self.rebuildNeeded = False

        module = self.currentBuild.files[locale][moduleName]
        if not "statics" in module["__manifest__"] or len(module["__manifest__"]["statics"]) == 0:
            return

        print "    Copying statics..."

        for static in module["__manifest__"]["statics"]:
            path = self.projectBuilder.resolveFile(static["path"], modulePath + "/statics")
            mtime = os.stat(path).st_mtime
            if path in self.timestamps and mtime == self.timestamps[path]:
                continue

            print "      %s..." % static["path"]

            self.rebuildNeeded = True
            self.timestamps[path] = mtime

            (directory, fileName) = os.path.split(path)
            (baseName, extension) = os.path.splitext(fileName)
            with open(path, "r") as inFile:
                content = inFile.read()

            destFileName = buildutil.getDestinationFileName(moduleName, baseName, content, None, extension)
            destPath = self.buildDir + "/" + destFileName
            if not os.path.exists(destPath): # avoid multiple locales copying the same file
                with open(destPath, "w") as outFile:
                    outFile.write(content)

            self.staticMap[path] = destFileName

    def isRebuildNeeded(self, locale, moduleName, modulePath):
        return self.rebuildNeeded

    def sourcesConcatenated(self, locale, moduleName, modulePath):
        if len(self.staticMap) > 0:
            module = self.currentBuild.files[locale][moduleName]

            staticDefs = []
            for path in self.staticMap:
                staticDefs.append("\"%s\": \"%s\"" % (path, self.staticMap[path]))
            module["__concat__"] += "Modules.%s.statics = { %s };\n" % (moduleName, ", ".join(staticDefs))
