from __future__ import with_statement
from builderror import BuildError
from shermanfeature import ShermanFeature

import hashlib
import os
import shutil

try:
    import multiprocessing
    JSLINT_MP = True
    JSLINT_MP_PROCESSES = multiprocessing.cpu_count()
except:
    JSLINT_MP = False
    JSLINT_MP_PROCESSES = 0


class JSLint(object):
    def __call__(self, shermanDir, path):
        return self.runJsLint(shermanDir, path)

    def getJsLintCacheFile(self, path):
        statbuf = os.stat(path)
        m = hashlib.md5()
        m.update(path)
        filename = "%s/jslint-%s-%d.tmp" % ("/tmp", m.hexdigest(), statbuf.st_mtime)
        return filename

    """
        If there is a cache, that means that the JSLInt run for this file was
        successfull.
    """
    def hasJsLintCache(self, path):
        cachefile = self.getJsLintCacheFile(path)
        return os.path.isfile(cachefile)

    def setJsLintCache(self, path):
        cachefile = self.getJsLintCacheFile(path)

        with file(cachefile, 'a'):
            os.utime(cachefile, None)

    def runJsLint(self, shermanDir, path):
        if self.hasJsLintCache(path):
            return (True, path)

        print "  Running jslint for %s" % os.path.basename(path)

        currentDir = os.curdir
        os.chdir(shermanDir)
        cmd = "other/jslint/lint < %s > /dev/null" % path
        result = os.system(cmd)
        if result != 0:
            os.chdir(currentDir)
            return (False, path)

        os.chdir(currentDir)
        self.setJsLintCache(path)
        return (True, path)


class Feature(ShermanFeature):

    def manifestLoaded(self, moduleName, modulePath):
        defaultLocale = self.projectBuilder.projectManifest["defaultLocale"]
        module = self.currentBuild.files[defaultLocale][moduleName]

        try:
            paths = []
            for source in module["__manifest__"]["sources"]:
                if not "runJsLint" in source or source["runJsLint"] == True:
                    path = modulePath + "/js/" + source["path"]
                    paths.append(path)

            errors = []
            if JSLINT_MP:
                pool = multiprocessing.Pool(JSLINT_MP_PROCESSES)
                results = [pool.apply_async(JSLint(), (self.shermanDir, path,)) for path in paths]
                for result in results:
                    r = result.get()
                    if not r[0]:
                        errors.append(r[1])
            else:
                for path in paths:
                    jsLint = JSLint()
                    if not jsLint(self.shermanDir, path):
                        errors.append(path)

            for error in errors:
                print "  jslint error in file %s" % error
        except Exception, exception:
            raise BuildError("Could not run jslint for module %s" % moduleName, exception)
        if len(errors) > 0:
            shutil.move(self.shermanDir + "/report.html", self.projectDir + "/report.html")
            raise BuildError("jslint errors detected, see report.html for details.")
