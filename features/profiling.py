from shermanfeature import ShermanFeature

import buildutil

try:
    import json
except ImportError:
    import simplejson as json


class Feature(ShermanFeature):

    def __init__(self, options):
        ShermanFeature.__init__(self, options)

        self.additionalBootResources.append({
            "path": "/features/profiling/profiling.js",
            "inline": True
        })

    @ShermanFeature.priority(40)
    def generateBootstrapCode(self, locale, bootstrapCode):
        bootstrapCode["head"] = (
            "var bootProfilingToken = Profiling.start(\"boot\");"
            "%(head)s"
        ) % {
            "head": bootstrapCode["head"]
        }

    def showProfileDump(self, contents):
        dump = json.loads(contents)

        def colorize(string, color):
            return "\x1B[" + color + "m" + string + "\x1B[00m"

        class Node(object):
            def __init__(self, parent = None):
                self.parent = parent
                if self.parent:
                    self.parent.children.append(self)
                self.children = []

                self.name = ""
                self.runningTime = 0
                self.synchronous = True

            def printNode(self, indent = ""):
                if self.name:
                    if self.runningTime:
                        childrenTime = 0
                        for child in self.children:
                            if child.runningTime:
                                childrenTime += child.runningTime
                        if childrenTime > 0:
                            print indent + colorize(self.name + ": " + str(self.runningTime) + "ms (own: " + str(self.runningTime - childrenTime) + "ms)", "00;32")
                        else:
                            print indent + colorize(self.name + ": " + str(self.runningTime) + "ms", "00;32" if self.synchronous else "00;35")
                    else:
                        print indent + colorize(self.name + ": unfinished", "00;31")
                    indent = indent + "    "
                for child in self.children:
                    child.printNode(indent)

        tree = Node()
        curNode = tree
        for action in dump["data"]:
            synchronous = action["s"]
            token = action["t"]

            if action["a"] == "start":
                newNode = Node(curNode if synchronous else tree)
                newNode.name = action["k"]
                newNode.synchronous = synchronous
                newNode.startTime = action["ts"]
                newNode.token = token
                if synchronous:
                    curNode = newNode
            else:
                endTime = action["ts"]
                if synchronous:
                    while curNode.parent and curNode.token != token:
                        curNode = curNode.parent
                    if curNode.token == token:
                        curNode.runningTime = endTime - curNode.startTime
                    if curNode.parent:
                        curNode = curNode.parent
                else:
                    for child in tree.children:
                        if child.token == token:
                            child.runningTime = endTime - curNode.startTime
                            break

        print "Profiling dump for " + colorize(dump["name"] if "name" in dump else "unnamed dump", "00;36") + ":"
        tree.printNode()
