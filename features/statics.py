from shermanfeature import ShermanFeature

import buildutil
import os


class Feature(ShermanFeature):

    timestamps = {}

    rebuildNeeded = False

    def manifestLoaded(self, moduleName, modulePath, manifest):
        self.rebuildNeeded = False

        if not "statics" in manifest or len(manifest["statics"]) == 0:
            return

        for static in manifest["statics"]:
            path = self.projectBuilder.resolveFile(static["path"], modulePath + "/statics")
            mtime = os.stat(path).st_mtime
            if path in self.timestamps and mtime == self.timestamps[path]:
                continue

            self.rebuildNeeded = True
            self.timestamps[path] = mtime

        if not self.rebuildNeeded:
            return

        print "  Copying statics..."

        for locale in self.projectBuilder.locales:
            self.currentBuild.files[locale][moduleName]["__staticMap__"] = {}

        for static in manifest["statics"]:
            print "    %s..." % static["path"]

            path = self.projectBuilder.resolveFile(static["path"], modulePath + "/statics")

            (directory, fileName) = os.path.split(path)
            (baseName, extension) = os.path.splitext(fileName)
            with open(path, "r") as inFile:
                content = inFile.read()

            destFileName = buildutil.getDestinationFileName(moduleName, baseName, content, None, extension)

            # HACK: Make sure statics use same filename for debug and normal builds
            destFileName = destFileName.replace(".debug.", ".")

            destPath = self.buildDir + "/" + destFileName
            if not os.path.exists(destPath): # avoid multiple locales copying the same file
                with open(destPath, "w") as outFile:
                    outFile.write(content)

            for locale in self.projectBuilder.locales:
                self.currentBuild.files[locale][moduleName]["__staticMap__"][static["path"]] = destFileName

    def isRebuildNeeded(self, locale, moduleName, modulePath):
        return self.rebuildNeeded

    def sourcesConcatenated(self, locale, moduleName, modulePath):
        module = self.currentBuild.files[locale][moduleName]
        if "__staticMap__" in module and len(module["__staticMap__"]) > 0:
            staticDefs = []
            for path in module["__staticMap__"]:
                staticDefs.append("\"%s\": \"%s\"" % (path, module["__staticMap__"][path]))
            module["__concat__"] += "Modules.%s.statics = { %s };\n" % (moduleName, ", ".join(staticDefs))
