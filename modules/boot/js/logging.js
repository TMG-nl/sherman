var logging = {
    debug: function(msg) {
        var pad = function(n, c) {
            c = c || 2;
            var t = 10;
            var s = "";
            for (var i = 1; i < c; i++) {
                if (n < t) {
                    s += "0";
                }
                t *= 10;
            }
            return s + n;
        };

        var d = new Date();
        var s = pad(d.getHours()) + ":" +
                pad(d.getMinutes()) + ":" +
                pad(d.getSeconds()) + ":" +
                pad(d.getMilliseconds(), 3);

        var i;
        var _msg;
        if (msg instanceof Array) {
            _msg = [s];
            for (i = 0; i < msg.length; i++) {
                _msg.push(msg[i]);
            }
        } else if (arguments.length <= 1) {
            _msg = [s, msg];
        } else {
            _msg = [s];
            for (i = 0; i < arguments.length; i++) {
                _msg.push(arguments[i]);
            }
        }

        if (Testing.log) {
            Testing.log("debug: " + _msg.join(", "));
        } else if (window.debug && debug.log) {
            debug.log(_msg.join(", "));
        } else if (window.console) {
            var c = console; // to prevent removal by build system
            c.log(_msg);
        }
    },

    error: function(msg) {

        if (Testing.log) {
            Testing.log("ERROR: " + msg);
        } else if (window.debug && debug.log) {
            debug.log(msg);
        } else if (window.console) {
            if (console.error) {
                console.error(msg);
            } else {
                console.log(msg);
            }
        }
    },

    exception: function(msg, e) {
 
        msg += ": " + (e === undefined ? "Unknown exception caught" : e.toString() + (e.error_code ? (" (" + e.error_code + ")") : ""));

        if (Testing.log) {
            Testing.log("EXCEPTION: " + msg);
        } else if (window.debug && debug.log) {
            debug.log(msg);
        } else if (window.console && window.console.error) {
            console.error(msg); // Log the message to the console so it can be inspected.
            console.error(e); // Send the exception to the console so it can be inspected.
            if (console.trace) {
                console.trace();
            }
        }
    }
};

if (window.location.href.indexOf("debug=1") !== -1) {

    if (window.location.host.indexOf("hyves.nl") === -1) {

        (function injectWeinre() {

            /*
             * To run weinre:
             *
             * start the server from the CLI:
             * ./start_weinre.sh
             *
             * go to http://<yourhostname>.hyveshq:9191/client/#hybrid
             *
             * You can only use weinre if the Hybrid is ran from the same hostname (e.g.)
             * http://<yourhostname>.hyveshq:9090/
             *
             * More info on weinre: http://phonegap.github.com/weinre/
             */
            logging.debug('Setting up weinre for ' + window.location.hostname + ', target id: hybrid');

            var element = document.createElement("script");
            element.type = "text/javascript";
            element.src = "http://" + window.location.hostname + ":9191/target/target-script-min.js#hybrid";
            document.head.appendChild(element);
        })();
    }

    logging.isDebug = function() { return true; };

    debugCall = function(methodName, params, apiVersion) {
        if (apiVersion) {
            params.ha_version = apiVersion;
        }
        Api.call(methodName, params).then(function(result) { logging.debug(result); });
    };
} else {
    logging.isDebug = function() { return false; };
}
