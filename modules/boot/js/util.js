
/**
 * Creates a new array with all elements that pass the test implemented by the
 * provided function.
 *
 * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/filter
 */
if (!Array.prototype.filter) {
    Array.prototype.filter = function(fun/*, thisp */) {
        "use strict";
        if (this === void 0 || this === null) {
            throw new TypeError();
        }
        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof fun !== "function") {
            throw new TypeError();
        }
        var res = [];
        var thisp = arguments[1];
        for (var i = 0; i < len; i++) {
            if (i in t) {
                var val = t[i]; // in case fun mutates this
                if (fun.call(thisp, val, i, t)) {
                    res.push(val);
                }
            }
        }
        return res;
    };
}

/**
 * Executes a provided function once per array element.
 *
 * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/forEach
 */
if (!Array.prototype.forEach) {
    Array.prototype.forEach = function(fun/*, thisp */) {
        "use strict";
        if (this === void 0 || this === null) {
            throw new TypeError();
        }
        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof fun !== "function") {
            throw new TypeError();
        }
        var thisp = arguments[1];
        for (var i = 0; i < len; i++) {
            if (i in t) {
                fun.call(thisp, t[i], i, t);
            }
        }
    };
}

/**
 * Returns an array of all own enumerable properties found upon a given object,
 * in the same order as that provided by a for-in loop (the difference being
 * that a for-in loop enumerates properties in the prototype chain as well).
 *
 * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object/keys
 */
if (!Object.keys) {
    Object.keys = function(object) {
        if (object !== Object(object)) {
            throw new TypeError("Object.keys called on non-object");
        }
        var keys = [], key;
        for (key in object) {
            if (Object.prototype.hasOwnProperty.call(object, key)) {
                keys.push(key);
            }
        }
        return keys;
    };
}

/**
 * Returns current UNIX timestamp.
 */
if (!Date.getUnixTimestamp) {
    Date.getUnixTimestamp = function() {
        return Math.round(new Date().getTime() / 1000);
    };
}

if (!Number.randomId) {
    Number.randomId = function(numDigits) {
        s = "";
        do {
            s += Math.floor(Math.random() * 0xffff).toString(16);
        } while (s.length < numDigits);
        return s.substring(0, numDigits);
    };
}

/**
 * Returns a string with its first character capitalized
 */
if (!String.prototype.capitalize) {
    String.prototype.capitalize = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    }
}

function randomHash() {

    var len = 12;
    var rnd = "";
    while (rnd.length < len) {
        rnd = rnd + Math.floor(Math.random() * (1 << 30)).toString(16).toUpperCase();
    }
    return rnd.substring(0, len);
}

/**
 * Returns the value for a given query string key.
 * @todo It would be better to parse the query string once and cache the result.
 *
 * @param name Query string key
 * @param defaultValue If the query string is not found it returns this value.
 * @param queryString Query string to pick the value from, if none is provided
 *                    window.location.search query string will be used. This
 *                    parameter makes the function testable.
 *
 * @return The value of the query string or defaultValue if the key is
 *         not found. If the value is empty an empty string is returned.
 */
function getQueryParam(name, defaultValue, queryString) {

    if (queryString === undefined) {
        queryString = window.location.search;
    }
    var match = RegExp("[?&]" + name + "=([^&]*)").exec(queryString);

    return match ?
        decodeURIComponent(match[1].replace(/\+/g, " "))
        : defaultValue;
}

/**
 * Decode a normal js string to a html escaped one (with &gt; etc)
 * which can be used to put into innerHTML fields.
 */
function htmlEncode(value) {

    return $("<div/>").text(value).html();
}
