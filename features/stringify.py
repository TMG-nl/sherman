from shermanfeature import ShermanFeature

import buildutil


class Feature(ShermanFeature):

    def sourcesConcatenated(self, locale, moduleName, modulePath):
        if moduleName == "inline":
            return

        module = self.currentBuild.files[locale][moduleName]

        bootNs = self.currentBuild.files[locale]["boot"]["__manifest__"]["namespace"]

        js = buildutil.jsStringEscape(module["__concat__"])

        if moduleName == "boot":
            js = "try{%s.Modules.addModule(\"%s\",'%s')}catch(e){giveUp(e)}" % (bootNs, moduleName, js)
        else:
            js = "%s.Modules.addModule(\"%s\",'%s')" % (bootNs, moduleName, js)

        module["__concat__"] = js
