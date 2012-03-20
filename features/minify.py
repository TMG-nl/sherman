from __future__ import with_statement
from builderror import BuildError
from shermanfeature import ShermanFeature

import codecs
import os
import re
import subprocess


class Feature(ShermanFeature):

    @ShermanFeature.priority(90)
    def sourcesConcatenated(self, locale, moduleName, modulePath):
        print "    Minifying JavaScript..."

        module = self.currentBuild.files[locale][moduleName]

        js = module["__concat__"]

        js = self.preMinifyTricks(js)

        tempPath = self.projectBuilder.buildDir + "/" + moduleName + ".js"
        with codecs.open(tempPath, "w", "utf-8") as f:
            f.write(js)
        p = subprocess.Popen("java -jar %s/other/closure-compiler/compiler.jar --js %s --jscomp_off nonStandardJsDocs" %
                             (self.shermanDir, tempPath), shell = True, stdout = subprocess.PIPE, stderr = subprocess.PIPE)

        js = ""
        err = ""
        while p.poll() == None:
            (stdoutdata, stderrdata) = p.communicate()
            js += stdoutdata
            err += stderrdata

        if p.returncode == 0:
            os.remove(tempPath)
        else:
            raise BuildError("Minification of module %s failed: %s" % (moduleName, err))

        module["__concat__"] = js

    def preMinifyTricks(self, js):

        js = re.compile(r"((\w+\.)?)(?<!\w)Application *=", flags = re.MULTILINE).sub(r"\1A = \1Application =", js)
        js = re.compile(r"(?<!\w)Application\.", flags = re.MULTILINE).sub("A.", js)

        js = re.compile(r"((\w+\.)?)(?<!\w)Modules *=", flags = re.MULTILINE).sub(r"\1M = \1Modules =", js)
        js = re.compile(r"(?<!\w)Modules\.", flags = re.MULTILINE).sub("M.", js)

        js = re.compile(r"((\w+\.)?)(?<!\w)Tiles *=", flags = re.MULTILINE).sub(r"\1T = \1Tiles =", js)
        js = re.compile(r"(?<!\w)Tiles\.showTileInContainer", flags = re.MULTILINE).sub("T.c", js)
        js = re.compile(r"(?<!\w)Tiles\.showTile", flags = re.MULTILINE).sub("T.s", js)
        js = re.compile(r"(?<!\w)Tiles\.pushModalTile", flags = re.MULTILINE).sub("T.m", js)
        js = re.compile(r"(?<!\w)Tiles\.", flags = re.MULTILINE).sub("T.", js)

        js = re.compile(r"((\w+\.)?)(?<!\w)UserAgent *=", flags = re.MULTILINE).sub(r"\1U = \1UserAgent =", js)
        js = re.compile(r"(?<!\w)UserAgent\.", flags = re.MULTILINE).sub("U.", js)

        return js
