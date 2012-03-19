from shermanfeature import ShermanFeature

import re

try:
    import json
except ImportError:
    import simplejson as json


class Feature(ShermanFeature):

    tileModuleDependencies = {}

    def __init__(self, options):
        ShermanFeature.__init__(self, options)

        self.additionalBootResources.append({
            "path": "/features/tiles/routes.js"
        })
        self.additionalBootResources.append({
            "path": "/features/tiles/history.js"
        })
        self.additionalBootResources.append({
            "path": "/features/tiles/tiles.js"
        })

    def sourcesLoaded(self, locale, moduleName, modulePath):
        module = self.currentBuild.files[locale][moduleName]

        self.tileModuleDependencies[moduleName] = []
        for source in module["__manifest__"]["sources"]:
            path = self.projectBuilder.resolveFile(source["path"], modulePath + "/js")
            for tile in re.findall("function ([A-Z]+[A-Za-z]+Tile)\(container", module[path]):
                if not tile in self.tileModuleDependencies[moduleName]:
                    self.tileModuleDependencies[moduleName].append(tile)
        if len(self.tileModuleDependencies[moduleName]) == 0:
            del self.tileModuleDependencies[moduleName]

    def modulesWritten(self):
        for locale in self.projectBuilder.locales:
            module = self.currentBuild.files[locale]["inline"]

            tileModuleDependencies = json.dumps(self.tileModuleDependencies).replace(", ", ",").replace(": ", ":")
            module["__concat__"] += "Modules.tileModuleDependencies=%s;" % tileModuleDependencies
