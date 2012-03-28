from builderror import BuildError
from shermanfeature import ShermanFeature

import subprocess
import sys


class Feature(ShermanFeature):

    @ShermanFeature.priority(60)
    def sourcesLoaded(self, locale, moduleName, modulePath):
        module = self.currentBuild.files[locale][moduleName]

        if not "__styles__" in module:
            return

        if not self.projectBuilder.features["css"].isRebuildNeeded(locale, moduleName, modulePath):
            return

        print "    Compiling LESS..."

        pipes = subprocess.Popen(self.shermanDir + "/features/less/compile.js", shell = True, stdin = subprocess.PIPE, stdout = subprocess.PIPE)
        css = ""
        while pipes.poll() == None:
            (stdoutdata, stderrdata) = pipes.communicate(input = module["__styles__"])
            if stderrdata != None or pipes.returncode != 0:
                raise BuildError("Error compiling LESS styles: %s" % stderrdata)
            css += stdoutdata

        module["__styles__"] = css
