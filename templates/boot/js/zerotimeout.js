/**
 * We have a special function for triggering 0 millisecond timeouts. Triggering
 * such brief timeouts is not possible with the default setTimeout function.
 * @link http://dbaron.org/log/20100309-faster-timeouts
 */
(function() {

    var timeouts = [];
    var messageName = "zero-timeout-message";

    // Like setTimeout, but only takes a function argument.  There's
    // no time argument (always zero) and no arguments (you have to
    // use a closure).
    function setZeroTimeout(fn) {
        timeouts.push(fn);
        window.postMessage(messageName, "*");
    }

    function fallbackSetZeroTimeout(fn) {
        window.setTimeout(fn, 0);
    }

    function handleMessage(event) {
        if (event.source === window && event.data === messageName) {
            event.stopPropagation();
            if (timeouts.length > 0) {
                var fn = timeouts.shift();
                fn();
            }
        }
    }

    if (window.postMessage) {
        window.addEventListener("message", handleMessage, true);

        // Add the one thing we want added to the window object.
        window.setZeroTimeout = setZeroTimeout;
    } else {
        window.setZeroTimeout = fallbackSetZeroTimeout;
    }
})();
