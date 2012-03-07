from shermanfeature import ShermanFeature

import sys


class Feature(ShermanFeature):

    def __init__(self, options):
        ShermanFeature.__init__(self, options)

        sys.path.append(self.shermanDir + "/other/woodpecker")
        import cssparser
        import scsscompiler
        import scssimporter

        scssimporter.Importer.addPath(self.shermanDir + "/other/woodpecker/stylesheets")

        self.cssparser = cssparser
        self.scsscompiler = scsscompiler

    def sourcesLoaded(self, locale, moduleName, modulePath):
        module = self.currentBuild.files[locale][moduleName]

        if not "__styles__" in module:
            return

        if not self.projectBuilder.features["css"].isRebuildNeeded(locale, moduleName, modulePath):
            return

        print "    Compiling SCSS..."

        parser = self.cssparser.CSSParser()
        options = self.cssparser.CSSOptions(stripWhiteSpace = True, stripComments = True, minimizeValues = True,
                                            stripExtraSemicolons = True, colorize = False, compileScss = True)
        styleSheet = parser.parse(module["__styles__"], options)

        compiler = self.scsscompiler.SCSSCompiler()
        for prerequisite in module["__manifest__"]["dependencies"]:
            prereqModule = self.currentBuild.files[locale][prerequisite]
            if "__scssScope__" in prereqModule:
                print "      Including SCSS scope of module %s..." % prerequisite
                compiler.getGlobalScope().merge(prereqModule["__scssScope__"])

        compiler.compile(styleSheet, options)
        module["__styles__"] = styleSheet.toString(options)
        module["__scssScope__"] = compiler.getGlobalScope()
