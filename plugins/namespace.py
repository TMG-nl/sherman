import re


projectDir = None
shermanDir = None
buildDir = None

moduleReplacer = re.compile(r"^ *Modules\.", flags = re.MULTILINE)


def init(options):
    pass

def manifestLoaded(moduleName, modulePath, projectBuilder):
    pass

def sourcesLoaded(locale, moduleName, modulePath, projectBuilder):
    module = projectBuilder.currentBuild.files[locale][moduleName]
    namespace = module["__manifest__"]["namespace"]

    varReplacer = re.compile(r"^(?:var )?([a-zA-Z0-9.]+) = ", flags = re.MULTILINE)
    functionReplacer = re.compile(r"^function ([a-zA-Z0-9]+)\(", flags = re.MULTILINE)

    for source in module["__manifest__"]["sources"]:
        if "excludeFromNamespace" in source and source["excludeFromNamespace"] == True:
            continue

        path = "js/" + source["path"]

        js = module[path]
        js = varReplacer.sub(r"%s.\1 = " % namespace, js)
        js = functionReplacer.sub(r"%s.\1 = function \1(" % namespace, js)
        module[path] = js

def isRebuildNeeded(locale, moduleName, modulePath, projectBuilder):
    return False

def sourcesConcatenated(locale, moduleName, modulePath, projectBuilder):
    module = projectBuilder.currentBuild.files[locale][moduleName]

    bootNs = projectBuilder.currentBuild.files[locale]["boot"]["__manifest__"]["namespace"]
    moduleNs = module["__manifest__"]["namespace"]
    if bootNs == moduleNs:
        bootNsPrefix = ""
    else:
        bootNsPrefix = bootNs + "."

    js = buildutil.jsStringEscape(module["__concat__"])

    if moduleName == "boot":
        js = ("var %s = %s || {};\n"
              "%s.NS = %s;\n"
              "with (%s) {\n%s\n}\n") % (bootNs, bootNs, bootNs, bootNs, bootNs, js)
    elif bootNs == moduleNs:
        js = ("with (%s) {\n"
              "Modules.%s = {};\n"
              "%s\n}\n" % (moduleNs, moduleName, js))
    else:
        js = moduleReplacer.sub(r"%sModules." % bootNsPrefix, js)
        js = ("%sModules.%s = {};\n"
              "var %s = %s || {};\n"
              "%s.NS = %s;\n"
              "with (%s) {\n%s\n}\n" % (bootNsPrefix, moduleNs, moduleNs, moduleNs, moduleNs, moduleNs, moduleNs, js))

    module["__concat__"] = js


def filesWritten(projectBuilder):
    pass
