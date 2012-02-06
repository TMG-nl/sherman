from builderror import BuildError


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

    try:
        for style in module["__manifest__"]["styles"]:
            path = "css/" + style["path"]
            contents = self.modifiedFiles.read(locale, modulePath + "/" + path)
            if contents:
                module[path] = contents
                rebuildNeeded = True
    except Exception, exception:
        raise BuildError("Could not load styles for module %s: %s" % (moduleName, str(exception)))

    if rebuildNeeded:
        print "    Loading CSS..."

        module["__styles__"] = u""

        for path in module:
            if path[0:5] == "css/":
                module["__styles__"] += module[path]

def isRebuildNeeded(locale, moduleName, modulePath, projectBuilder):
    global rebuildNeeded
    return rebuildNeeded

def sourcesConcatenated(locale, moduleName, modulePath, projectBuilder):
    module = projectBuilder.currentBuild.files[locale][moduleName]

    if "__styles__" in module:
        module["__concat__"] += ("Modules.%s.css = \"%s\";\n" % (moduleName,
                                 module["__styles__"].replace("\"", "\\\"").replace("\n", "\\n")))

def filesWritten(projectBuilder):
    pass
