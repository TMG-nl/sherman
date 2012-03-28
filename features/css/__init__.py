from __future__ import with_statement
from builderror import BuildError
from shermanfeature import ShermanFeature

import buildutil
import codecs


class Feature(ShermanFeature):

    rebuildNeeded = False

    def sourcesLoaded(self, locale, moduleName, modulePath):
        self.rebuildNeeded = False

        module = self.currentBuild.files[locale][moduleName]

        if not "styles" in module["__manifest__"]:
            return

        try:
            for style in module["__manifest__"]["styles"]:
                path = self.projectBuilder.resolveFile(style["path"], modulePath + "/css")
                contents = self.projectBuilder.modifiedFiles.read(locale, path)
                if contents:
                    module[path] = contents
                    self.rebuildNeeded = True
        except Exception, exception:
            raise BuildError("Could not load styles for module %s" % moduleName, exception)

        if not self.rebuildNeeded:
            return

        print "    Loading CSS..."

        module["__styles__"] = u""

        for style in module["__manifest__"]["styles"]:
            path = self.projectBuilder.resolveFile(style["path"], modulePath + "/css")
            module["__styles__"] += module[path]

    def isRebuildNeeded(self, locale, moduleName, modulePath):
        return self.rebuildNeeded

    def sourcesConcatenated(self, locale, moduleName, modulePath):
        module = self.currentBuild.files[locale][moduleName]

        if "__styles__" in module:
            if not "bundled" in self.config or ("bundled" in self.config and self.config["bundled"]):
                styles = module["__styles__"].replace("\"", "\\\"").replace("\n", "\\n")
                module["__concat__"] += "Modules.%s.css = \"%s\";\n" % (moduleName, styles)
            else:
                try:
                    styles = module["__styles__"]
                    fileName = buildutil.getDestinationFileName(moduleName, None, styles, None, "css")
                    if not os.path.exists(self.buildDir + "/" + fileName): # avoid multiple locales writing the same file
                        with codecs.open(self.buildDir + "/" + fileName, "w", "utf-8") as f:
                            f.write(styles)
                    module["__output__"].append(fileName)
                except Exception, exception:
                    raise BuildError("Could not write CSS output file for module %s" % moduleName, exception)
