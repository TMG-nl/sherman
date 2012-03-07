from __future__ import with_statement
from builderror import BuildError
from shermanfeature import ShermanFeature

import buildutil
import codecs
import os
import shutil
import subprocess

try:
    import multiprocessing
    JSLINT_MP = True
    JSLINT_MP_PROCESSES = multiprocessing.cpu_count()
except:
    JSLINT_MP = False
    JSLINT_MP_PROCESSES = 0


class Feature(ShermanFeature):

    def sourcesConcatenated(self, locale, moduleName, modulePath, projectBuilder):
        print "    Minifying JavaScript..."

        module = projectBuilder.currentBuild.files[locale][moduleName]

        tempPath = projectBuilder.buildDir + "/" + moduleName + ".js"
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
