from shermanfeature import ShermanFeature

import os
import shutil


class Feature(ShermanFeature):

    def buildFinished(self):
        print "Creating final archive..."
    
        fileName = self.projectBuilder.projectManifest["title"].lower().replace(" ", "-") + ".tar.gz"

        cwd = os.getcwd()
        os.chdir(self.buildDir)
        os.system("tar czf %s *" % fileName)
        shutil.copy(fileName, cwd)
        os.chdir(cwd)

        print "Created %s in current directory." % fileName
