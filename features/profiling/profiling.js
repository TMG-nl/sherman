Profiling = function() {

    var marks = [];
    var markId = 0;

    /**
     * Starts time measurement for a given key.
     *
     * @param key
     * @param options Optional options object. Set the property async to true
     *                to indicate this is an asynchronous operation being
     *                profiled.
     */
    function start(key, options) {

        options = options || {};
        var token = ++markId,
            ts = (new Date()).getTime();

        marks.push({ "k": key, "ts": ts, "a": "start", "t": token, "s": !options.async });

        return token;
    }

    /**
     * Stops time measurement for a given key.
     *
     * @param key
     * @param token Token for this profiling mark
     */
    function stop(key, token) {

        var startMark;
        for (var i = marks.length - 1; i >= 0; i--) {
            if (marks[i].t === token) {
                startMark = marks[i];
                break;
            }
        }
        if (!startMark) {
            logging.debug("Mismatched Profiling.stop() call with key " + key);
            return;
        }

        var ts = (new Date()).getTime();
        marks.push({ "k": key, "ts": ts, "a": "stop", "t": token, "s": startMark.s });
    }

    /**
     * Submits the profiling data to the development webserver. The server will
     * display formatted profiling info on its console.
     * 
     * @param name Name of this profile dump.
     */
    function submit(name) {

        var xhr = new XMLHttpRequest();  
        xhr.open("POST", "/profile-dump", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify({ "name": name, "data": marks }));

        marks = [];
    }

    return {
        "start": start,
        "stop": stop,
        "submit": submit
    };
}();
