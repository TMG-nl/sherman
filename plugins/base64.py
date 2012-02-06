import buildutil
import re


projectDir = None
shermanDir = None
buildDir = None


def init(options):
    pass

def manifestLoaded(moduleName, modulePath, projectBuilder):
    pass

def sourcesLoaded(locale, moduleName, modulePath, projectBuilder):
    module = projectBuilder.currentBuild.files[locale][moduleName]

    if not "__styles__" in module:
        return

    styles = module["__styles__"]

    for match in re.finditer(r"url\((base64/[^)]+)\)", styles):
        path = match.group(1)
        b64Image = buildutil.base64EncodeImage(modulePath + "/img/" + path)
        styles = styles.replace("url(%s)" % path, "url(%s)" % b64Image)

    module["__styles__"] = styles

def isRebuildNeeded(locale, moduleName, modulePath, projectBuilder):
    return False

def sourcesConcatenated(locale, moduleName, modulePath, projectBuilder):
    pass

def filesWritten(projectBuilder):
    pass
