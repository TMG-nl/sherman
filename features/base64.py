from shermanfeature import ShermanFeature

import buildutil
import re


class Feature(ShermanFeature):

    def sourcesLoaded(self, locale, moduleName, modulePath):
        module = self.currentBuild.files[locale][moduleName]
    
        if not "__styles__" in module:
            return
    
        styles = module["__styles__"]
    
        for match in re.finditer(r"url\((base64/[^)]+)\)", styles):
            path = match.group(1)
            b64Image = buildutil.base64EncodeImage(modulePath + "/img/" + path)
            styles = styles.replace("url(%s)" % path, "url(%s)" % b64Image)
    
        module["__styles__"] = styles
