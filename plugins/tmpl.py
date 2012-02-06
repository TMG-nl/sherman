from __future__ import with_statement
from builderror import BuildError

import buildutil
import os
import re


projectDir = None
shermanDir = None
buildDir = None


rebuildNeeded = False

def init(options):
    pass

def manifestLoaded(moduleName, modulePath, projectBuilder):
    pass

def sourcesLoaded(locale, moduleName, modulePath, projectBuilder):
    global rebuildNeeded
    rebuildNeeded = False

    module = projectBuilder.currentBuild.files[locale][moduleName]

    for path in buildutil.dirEntries(modulePath + "/tmpl"):
        path = "tmpl/" + path
        contents = projectBuilder.modifiedFiles.read(locale, modulePath + "/" + path)
        if contents:
            module[path] = contents
            rebuildNeeded = True

    if rebuildNeeded:
        print "    Loading templates..."

        module["__templates__"] = u""

        wsReplacer = re.compile(r"([>}])[ \t\n\r\f\v]+([<{])", flags = re.MULTILINE)
        spaceReplacer = re.compile(r"> <", flags = re.MULTILINE)

        for path in module:
            if path[0:5] == "tmpl/":
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

def isRebuildNeeded(locale, moduleName, modulePath, projectBuilder):
    global rebuildNeeded
    return rebuildNeeded

def sourcesConcatenated(locale, moduleName, modulePath, projectBuilder):
    module = projectBuilder.currentBuild.files[locale][moduleName]

    if "__templates__" in module:
        module["__concat__"] += module["__templates__"]

def filesWritten(projectBuilder):
    pass
