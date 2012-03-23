from shermanfeature import ShermanFeature

import re


class Feature(ShermanFeature):

    @ShermanFeature.priority(40)
    def sourcesConcatenated(self, locale, moduleName, modulePath):
        module = self.currentBuild.files[locale][moduleName]

        js = module["__concat__"]

        r = re.compile(r"^logging\.isDebug\s*=.*$", flags = re.MULTILINE)
        js = r.sub("", js)

        r = re.compile(r"logging\.isDebug\(\)", flags = re.MULTILINE)
        js = r.sub("false", js)

        r = re.compile(r".*logging\.debug.*$", flags = re.MULTILINE)
        js = r.sub("", js)

        r = re.compile(r".*console\.log.*$", flags = re.MULTILINE)
        js = r.sub("", js)

        module["__concat__"] = js
