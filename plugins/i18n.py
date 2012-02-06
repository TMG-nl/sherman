from builderror import BuildError
import buildutil
import os
import re

try:
    import json
except ImportError:
    import simplejson as json


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

    path = modulePath + "/i18n/translations.json"
    if not os.path.exists(path):
        return

    module = projectBuilder.currentBuild.files[locale][moduleName]

    try:
        contents = self.modifiedFiles.read(locale, path)
        if contents:
            print "    Loading translations..."

            translations = json.loads(contents)

            module["__translations__"] = translations

            module["__allTranslations__"] = {}
            for prerequisite in module["__manifest__"]["dependencies"]:
                prereqModule = projectBuilder.currentBuild.files[locale][prerequisite]
                module["__allTranslations__"].update(prereqModule["__translations__"])
            module["__allTranslations__"].update(translations)

            rebuildNeeded = True
    except Exception, exception:
        raise BuildError("Could not load translations for module %s: %s" % (moduleName, str(exception)))

def isRebuildNeeded(locale, moduleName, modulePath, projectBuilder):
    global rebuildNeeded
    return rebuildNeeded

def sourcesConcatenated(locale, moduleName, modulePath, projectBuilder):
    self.log("    Applying translations...")

    module = projectBuilder.currentBuild.files[locale][moduleName]

    module["__concat__"] = applyTranslations(module["__allTranslations__"], locale, moduleName, module["__concat__"], escaping = "javascript")

    if "__templates__" in module:
        module["__templates__"] = applyTranslations(module["__allTranslations__"], locale, moduleName, module["__templates__"], escaping = "html")

    localeTranslations = {}
    for key, values in sorted(module["__translations__"].items()):
        if locale in values:
            value = values[locale]
        else:
            raise BuildError("No translation possible for key %s and locale %s" % (key, locale))
        localeTranslations[key] = value
    module["__concat__"] += "Modules.%s.translations = %s;\n" % (moduleName, json.dumps(localeTranslations))

def applyTranslations(allTranslations, locale, moduleName, content, escaping):
    for match in re.finditer(r"\[\[([a-zA-Z0-9_]+)\]\]", content):
        key = match.group(1)
        if not key in allTranslations:
            raise BuildError("Undefined text key %s in module %s" % (key, moduleName))

        translations = allTranslations[key]
        if not locale in translations:
            raise BuildError("Translation not provided for text key %s and locale %s" % (key, locale))
        value = translations[locale]
        if escaping == "html":
            value = buildutil.htmlEscape(value)
        elif escaping == "javascript":
            value = json.dumps(value)
            if len(value) > 1:
                value = value[1:-1] # strip of the quotes on both sides
        else:
            raise BuildError("Unrecognized escaping type %s" % escaping)
        content = content.replace("[[%s]]" % key, value)
    return content

def filesWritten(projectBuilder):
    pass
