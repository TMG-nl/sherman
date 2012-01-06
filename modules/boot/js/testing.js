var Testing = function() {

    if (window.location.search.indexOf("seleniumtest=1") === -1) {
        return {
            "isTesting": function() { return false; }
        };
    }

    var logMessages = [];

    function log() {

        var message = "";
        for (var i = 0; i < arguments.length; i++) {
            message += arguments[i];
        }
        logMessages.push(message);
    }

    function getLogMessages() {

        return logMessages;
    }

    function getLogMessage(index) {

        if (index < 0) {
            if (logMessages.length + index < 0) {
                return "";
            }
            return logMessages[logMessages.length + index];
        } else {
            if (index >= logMessages.length) {
                return "";
            }
            return logMessages[index];
        }
    }

    return {
        "log": log,
        "getLogMessages": getLogMessages,
        "getLogMessage": getLogMessage,
        "isTesting": function() { return true; }
    };
}();
