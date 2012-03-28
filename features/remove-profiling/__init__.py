from shermanfeature import ShermanFeature

import re


class Feature(ShermanFeature):

    @ShermanFeature.priority(40)
    def sourcesConcatenated(self, locale, moduleName, modulePath):
        module = self.currentBuild.files[locale][moduleName]

        js = module["__concat__"]

        r = re.compile(r".*Profiling.(start|stop|submit|reset).*$", flags = re.MULTILINE)
        js = r.sub("", js)

        module["__concat__"] = js
