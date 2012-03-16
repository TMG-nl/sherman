from __future__ import with_statement
from builderror import BuildError
from shermanfeature import ShermanFeature

import codecs
import os
import subprocess


class Feature(ShermanFeature):

    @ShermanFeature.priority(90)
    def sourcesConcatenated(self, locale, moduleName, modulePath):
        print "    Minifying JavaScript..."

        module = self.currentBuild.files[locale][moduleName]

        tempPath = self.projectBuilder.buildDir + "/" + moduleName + ".js"
        with codecs.open(tempPath, "w", "utf-8") as f:
            f.write(module["__concat__"])
        p = subprocess.Popen("java -jar %s/other/closure-compiler/compiler.jar --js %s --jscomp_off nonStandardJsDocs 2>/dev/null" %
                             (self.shermanDir, tempPath), shell = True, stdout = subprocess.PIPE)

        js = ""
        while p.poll() == None:
            (stdoutdata, stderrdata) = p.communicate()
            js += stdoutdata

        os.remove(tempPath)
        if p.returncode != 0:
            raise BuildError("Minification of module %s failed" % moduleName)

        module["__concat__"] = js
