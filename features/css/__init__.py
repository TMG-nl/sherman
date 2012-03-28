from builderror import BuildError
from shermanfeature import ShermanFeature


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
            styles = module["__styles__"].replace("\"", "\\\"").replace("\n", "\\n")
            module["__concat__"] += "Modules.%s.css = \"%s\";\n" % (moduleName, styles)
