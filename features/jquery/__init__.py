from shermanfeature import ShermanFeature


class Feature(ShermanFeature):

    def __init__(self, config):
        ShermanFeature.__init__(self, config)

        self.additionalBootResources.append({
            "path": "/features/jquery/jquery.js",
            "excludeFromNamespace": True,
            "runJsLint": False
        })

    @ShermanFeature.priority(0)
    def manifestLoaded(self, moduleName, modulePath, manifest):
        ShermanFeature.manifestLoaded(self, moduleName, modulePath, manifest)
