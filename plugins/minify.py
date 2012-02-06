from __future__ import with_statement
from builderror import BuildError

import buildutil
import os


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
    print "Minifying output files with Closure Compiler..."

    module["__debugOutput__"] = []
    module["__compiledOutput__"] = []

    for fileName in module["__output__"]:
        if fileName[-3:] != ".js":
            continue

        uncompiledPath = projectBuilder.buildDir + "/" + fileName
        compiledPath = uncompiledPath + ".compiled"
        result = os.system("java -jar other/closure-compiler/compiler.jar --js %s --js_output_file %s --jscomp_off nonStandardJsDocs 2>/dev/null" % (uncompiledPath, compiledPath))
        if result == 0:
            debugFileName = fileName[:-3] + ".debug.js"
            debugPath = projectBuilder.buildDir + "/" + debugFileName
            shutil.move(uncompiledPath, debugPath)
            module["__debugOutput__"].append(debugFileName)

            with codecs.open(compiledPath, "r", "utf-8") as f:
                versionedFileName = buildutil.getDestinationFileName(moduleName, None, f.read(), self.currentLocale, "js")
            versionedPath = projectBuilder.buildDir + "/" + versionedFileName
            shutil.move(compiledPath, versionedPath)
            module["__compiledOutput__"].append(versionedFileName)
        else:
            raise BuildError("Compilation of %s failed." % fileName)

    module["__output__"] = module["__compiledOutput__"]
    del module["__compiledOutput__"]
