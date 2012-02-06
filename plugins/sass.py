from __future__ import with_statement
from builderror import BuildError

sys.path.append("../other/woodpecker")
import cssparser
import scsscompiler
import scssimporter


projectDir = None
shermanDir = None
buildDir = None


def init(options):
    pass

def manifestLoaded(moduleName, modulePath, projectBuilder):
    pass

def sourcesLoaded(locale, moduleName, modulePath, projectBuilder):
    module = projectBuilder.currentBuild.files[locale][moduleName]

    if "__styles__" in module:
        print "    Compiling SCSS..."

        parser = cssparser.CSSParser()
        options = cssparser.CSSOptions(stripWhiteSpace = True, stripComments = True, minimizeValues = True,
                                       stripExtraSemicolons = True, colorize = False, compileScss = True)
        styleSheet = parser.parse(module["__styles__"], options)

        compiler = scsscompiler.SCSSCompiler()
        for prerequisite in module["__manifest__"]["dependencies"]:
            prereqModule = projectBuilder.currentBuild.files[locale][prerequisite]
            if "__scssScope__" in prereqModule:
                print "      Including SCSS scope of module %s..." % prerequisite
                compiler.getGlobalScope().merge(prereqModule["__scssScope__"])

        compiler.compile(styleSheet, options)
        module["__styles__"] = styleSheet.toString(options)
        module["__scssScope__"] = compiler.getGlobalScope()

def isRebuildNeeded(locale, moduleName, modulePath, projectBuilder):
    return False

def sourcesConcatenated(locale, moduleName, modulePath, projectBuilder):
    pass

def filesWritten(projectBuilder):
    pass
