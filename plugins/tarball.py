import os
import shutil


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
    print "Creating final archive..."

    fileName = projectBuilder.projectManifest["title"].lower().replace(" ", "-") + ".tar.gz"

    cwd = os.getcwd()
    os.chdir(self.finalTargetDir)
    os.system("tar czf %s *" % fileName)
    shutil.copy(fileName, cwd)
    os.chdir(cwd)

    print "Created %s in current directory." % fileName
