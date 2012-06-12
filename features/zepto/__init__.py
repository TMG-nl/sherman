from shermanfeature import ShermanFeature


class Feature(ShermanFeature):

    def __init__(self, config):
        ShermanFeature.__init__(self, config)

        self.additionalBootResources.append({
            "path": "/features/zepto/zepto.js",
            "excludeFromNamespace": True,
            "runJsLint": False
        })
