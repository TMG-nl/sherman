from __future__ import with_statement
from builderror import BuildError
from shermanfeature import ShermanFeature

import buildutil
import os
import re


class Feature(ShermanFeature):

    rebuildNeeded = False

    def manifestLoaded(self, moduleName, modulePath, manifest):
        if moduleName != "boot":
            return

        hoganIncluded = False
        for source in manifest["sources"]:
            if source["path"].endswith("hogan/template.js"):
                hoganIncluded = True

        if not hoganIncluded:
            manifest["sources"].append({
                "path": "/features/hogan/template.js",
                "excludeFromNamespace": True,
                "runJsLint": False
            })

    def sourcesLoaded(self, locale, moduleName, modulePath):
        module = self.currentBuild.files[locale][moduleName]

        templates = buildutil.dirEntries(modulePath + "/tmpl")
        updatedTemplates = []
        for path in templates:
            if not path.endswith(".moustache.html"):
                continue

            path = self.projectBuilder.resolveFile(path, modulePath + "/tmpl")
            contents = self.projectBuilder.modifiedFiles.read(locale, path)
            if contents:
                module[path] = contents
                updatedTemplates.append(path)

        self.rebuildNeeded = len(updatedTemplates) > 0
        if not self.rebuildNeeded:
            return

        print "    Loading Hogan templates..."

        module["__templates__"] = u""

        for path in updatedTemplates:
            template = None
            templateId = None
            for line in module[path].splitlines():
                if line.startswith("<!-- template"):
                    try:
                        templateId = re.findall(r"id=\"(.*)\"", line)[0]
                    except IndexError:
                        raise BuildError("Template is missing an ID in file %s" % os.path.basename(path))
                    template = u""
                elif line.startswith("<!-- /template"):
                    template = template.replace(" href=\"#\"", " href=\"javascript:void(0)\"")

                    pipes = subprocess.Popen(self.shermanDir + "/other/hogan/precompile.js", shell = True, stdin = subprocess.PIPE, stdout = subprocess.PIPE)
                    compiledTemplate = ""
                    while pipes.poll() == None:
                        (stdoutdata, stderrdata) = pipes.communicate(input = template)
                        if stderrdata != None or pipes.returncode != 0:
                            raise BuildError("Error compiling Moustache template %s: %s" % (os.path.basename(path), stderrdata))
                        compiledTemplate += stdoutdata
                    module["__templates__"] += "Modules.%s.templates[\"%s\"] = new Hogan.Template(%s);\n" % (moduleName, templateId, compiledTemplate)
                    template = None
                else:
                    if template is not None:
                        template += line

    def isRebuildNeeded(self, locale, moduleName, modulePath):
        return self.rebuildNeeded

    def sourcesConcatenated(self, locale, moduleName, modulePath):
        module = self.currentBuild.files[locale][moduleName]

        if "__templates__" in module:
            module["__concat__"] += module["__templates__"]
