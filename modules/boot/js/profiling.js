/* Client-side profiling */

Profiling = function() {

    var marks = [];
    var enabled = false;

    /**
     * Starts time measurement for a given key
     *
     * @param key (string)
     * @param token (string) - optional token to identify this marker
     *
     */
    function start(key, token) {

        if (!enabled) {
            return;
        }

        var ts = (new Date()).getTime();
        if (token === undefined) {
            token = Number.randomId(7);
        }

        logging.debug("Profiling: start " + key + " (" + token + ")");

        marks.push({ key: key, timestamp: ts, action: "start", token: token });

        return token;
    }

    /**
     * Stops time measurement for a given key
     *
     * @param key (string)
     * @param token (string) - token for this profiling mark
     *
     */
    function stop(key, token) {

        if (!enabled) {
            return;
        }

        logging.debug("Profiling: stop " + key + " (" + token + ")");
        var ts = (new Date()).getTime();
        marks.push({ key: key, timestamp: ts, action: "stop", token: token });
    }

    var node;
    var nodeTokenMap = {};

    /**
     * Builds the profiling tree
     */
    function buildTree() {

        _marks = mergeWithGapMarks(marks);
        if (_marks.length === 0) {
            return {};
        }

        var tree = new Node();
        var node = tree;
        var elapsed;

        for (var i = 0; i < _marks.length; i++) {
            var mark = _marks[i];
            if (mark.action === "start") {
                node = node.appendChild(new Node(mark));
                nodeTokenMap[mark.token] = node;
            } else if (mark.action === "gapStart") {
                // nicely formatted key
                var methodStart = mark.key.indexOf("ha_method=");
                var key = "";
                if (methodStart === -1) {
                    key = mark.key;
                } else {
                    do {
                        // concatentate all ha_methods
                        var methodEnd = mark.key.indexOf("&", methodStart);
                        key += mark.key.substring(methodStart + "ha_method=".length, methodEnd) + ".";
                        methodStart = mark.key.indexOf("ha_method=", methodEnd);
                    }
                    while (methodStart !== -1);
                }
                mark.key = "GAP." + key;
                node.appendChild(new Node(mark));
            } else if (mark.action === "stop") {
                if (node.mark.token === mark.token) {
                    elapsed = mark.timestamp - node.mark.timestamp;
                    node.mark.elapsed = elapsed;
                } else {
                    var tempNode = nodeTokenMap[mark.token];
                    if (!tempNode) {
                        logging.debug("Profiling: ERROR: could not find node for mark " + mark.token);
                        return {};
                    }

                    elapsed = mark.timestamp - tempNode.mark.timestamp;
                    tempNode.mark.elapsed = elapsed;
                }
                if (node.parentNode !== null) {
                    node = node.parentNode;
                }
            }
        }

        return tree;
    }

    /**
     * Merge with profiling marks from gap container
     */
    function mergeWithGapMarks(marks) {

        if (window.GapProfiling) {
            var gapMarks = window.GapProfiling.getMarks();

            if (gapMarks.length === 0) {
                return marks;
            }

            // O(n*m)...
            var marksIndex = 0;
            var mergedMarks = [];
            for (var i = 0; i < gapMarks.length; i++) {
                var gapMark = gapMarks[i];
                gapMark.action = "gapStart";
                var j;
                for (j = marksIndex; j < marks.length; j++) {
                    var mark = marks[j];
                    if (gapMark.timestamp <= mark.timestamp) {
                        mergedMarks.push(gapMark);
                        break;
                    } else {
                        mergedMarks.push(mark);
                    }
                }
                marksIndex = j;
            }

            return mergedMarks;
        } else {
            return marks;
        }
    }

    function toString() {

        var tree = buildTree();

        logging.debug("---------------------");
        prettyPrint(tree, 0);
        if (window.GapProfiling) {
            var cacheStats = window.GapProfiling.getCacheStats();
            logging.debug("CACHE hits: " + cacheStats.hits + " misses: " + cacheStats.misses);
        }
        logging.debug("---------------------");
    }

    function prettyPrint(node, depth) {

        if (node.mark) {
            var prefix = "";
            // jslint won't allow 'new Array(depth + 1).join(" ")'... so use for loop
            for (var c = 1; c < depth + 1; c++) {
                prefix += " ";
                if (c === depth) {
                    prefix += " ";
                }
            }
            logging.debug(prefix + node.mark.key + " " + node.mark.elapsed + " ms");
        }
        depth++;

        if (node.children) {
            for (var i = 0; i < node.children.length; i++) {
                prettyPrint(node.children[i], depth);
            }
        }
    }

    function getTree() {

        return buildTree();
    }

    function Node(mark) {

        this.parentNode = null;
        this.mark = mark;
        this.children = [];
        this.elapsed = null;
    }

    Node.prototype.appendChild = function(node) {

        this.children.push(node);
        node.parentNode = this;
        return node;
    };

    function enable() {

        enabled = true;
        if (window.GapProfiling) {
            window.GapProfiling.enable();
        }
    }

    function disable() {

        enabled = false;
        if (window.GapProfiling) {
            window.GapProfiling.disable();
        }
    }

    function clear() {

        logging.debug("clear profiling data");
        marks = [];
        if (window.GapProfiling) {
            window.GapProfiling.clear();
        }
    }
    
    function dumpSlowCss() {
        
        var elems = $("*");
        var elemCount = elems.length;
        
        var boxShadowElems = [];
        var textShadowElems = [];
        var gradientElems = [];
        
        
        elems.each(function(i, elem) {
            
            if ($(elem).css("-webkit-box-shadow") !== "none") {
                boxShadowElems.push(elem);
            }
            if ($(elem).css("text-shadow") !== "none") {
                textShadowElems.push(elem);
            }
            if ($(elem).css("background-image").indexOf("-webkit-gradient") >= 0) {
                gradientElems.push(elem);
            }
        });
        
        console.log("DOM contains "+elemCount+" elements");
        console.log("----");
        console.log("There are "+boxShadowElems.length +" elements with BOX SHADOW:");
        boxShadowElems.forEach(function(elem) {
           console.log(elem); 
        });
        console.log("----");
        
        console.log("There are "+textShadowElems.length +" elements with TEXT SHADOW:");
        textShadowElems.forEach(function(elem) {
           console.log(elem); 
        });
        console.log("----");
        
        console.log("There are "+gradientElems.length +" elements with GRADIENT:");
        gradientElems.forEach(function(elem) {
           console.log(elem); 
        });
        console.log("----");
    }

    return {
        "start": start,
        "stop": stop,
        "getTree": getTree,
        "toString": toString,
        "enable": enable,
        "disable": disable,
        "clear": clear,
        "dumpSlowCss": dumpSlowCss
    };
}();
