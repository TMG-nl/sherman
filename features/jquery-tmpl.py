from __future__ import with_statement
from builderror import BuildError
from shermanfeature import ShermanFeature

import buildutil
import os
import re


class Feature(ShermanFeature):

    rebuildNeeded = False

    def __init__(self, config):
        ShermanFeature.__init__(self, config)

        self.additionalBootResources.append({
            "path": "/features/jquery-tmpl/jquery.tmpl.js",
            "excludeFromNamespace": True,
            "runJsLint": False
        })

    def sourcesLoaded(self, locale, moduleName, modulePath):
        self.rebuildNeeded = False

        module = self.currentBuild.files[locale][moduleName]

        templates = buildutil.dirEntries(modulePath + "/tmpl")
        for path in templates:
            if not path.endswith(".tmpl.html"):
                continue

            path = self.projectBuilder.resolveFile(path, modulePath + "/tmpl")
            contents = self.projectBuilder.modifiedFiles.read(locale, path)
            if contents:
                module[path] = contents
                self.rebuildNeeded = True

        if not self.rebuildNeeded:
            return

        print "    Loading jQuery templates..."

        module["__templates__"] = u""

        wsReplacer = re.compile(r"([>}])[ \t\n\r\f\v]+([<{])", flags = re.MULTILINE)
        spaceReplacer = re.compile(r"> <", flags = re.MULTILINE)

        templates = buildutil.dirEntries(modulePath + "/tmpl")
        for path in templates:
            if not path.endswith(".tmpl.html"):
                continue

            path = self.projectBuilder.resolveFile(path, modulePath + "/tmpl")

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

                    template = wsReplacer.sub(r"\1 \2", template).strip()
                    template = spaceReplacer.sub(r"><", template)

                    module["__templates__"] += u"$.template(\"%s.%s\", '%s');\n" % (moduleName, templateId, buildutil.jsStringEscape(template))
                    template = None
                else:
                    if template is not None:
                        template += line

    def isRebuildNeeded(self, locale, moduleName, modulePath):
        return self.rebuildNeeded

    def sourcesConcatenated(self, locale, moduleName, modulePath):
        module = self.currentBuild.files[locale][moduleName]

        if "__templates__" in module:
            templates = module["__templates__"]

            if "profiling" in self.projectBuilder.features:
                templates = ("var profilingToken = Profiling.start(\"defineTemplates:" + moduleName + "\");" +
                             templates +
                             "Profiling.stop(\"defineTemplates:" + moduleName + "\", profilingToken);")

            module["__concat__"] += templates
