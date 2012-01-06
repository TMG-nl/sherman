
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
if (!String.capitalize) {
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
 * Returns the translation for a specific text key.
 *
 * @param module Name of the module in which the text key is defined. Note that
 *                if the text key is not found in the module, any prerequisite
 *                modules of this module are searched as well.
 * @param textKey The text key for which to get the translation, or optionally
 *                 an array containing two or three text keys (see below).
 *
 * <p>Besides the standard parameters mentioned above, you can specify an
 * arbitrary amount of parameters that will be used as substitutes. For example,
 * if the translation contains the substring "%1", and you have specified an
 * additional parameter, then "%1" will be replaced with the parameter.
 * Similarly, "%2" can be replaced by the second additional parameter, and so
 * on.
 *
 * <p>If you have specified an array as text key, it is expected that you have
 * supplied at least one substitute parameters. What happens exactly depends on
 * whether you specified two or three text keys in the array. If you specified
 * two keys, the first one will be used if the value of the substitute parameter
 * is 1, and the second one otherwise. If you specified three keys, the first
 * one will be used if the value of the substitute parameter is 0, the second if
 * the value is 1, and the third otherwise. This allows you to easily specify
 * different text keys depending on the value of a parameter.
 *
 * @return The translation, with any substitute parameters replaced.
 *
 * @example (Remove the spacebar between the [ and [ to make sure it gets translated ]]
 * i18n("core", "[ [HOME] ]")
 * // returns "Home"
 *
 * i18n("core", "[ [FRIEND_ADDED] ]", "Nick Cave")
 * // returns "Nick Cave has been added to your friends!"
 *
 * i18n("core", ["[ [NO_PHOTOS] ]", "[ [1_PHOTO] ]", "[ [N_PHOTOS] ]"], 0)
 * // returns "No photos"
 *
 * i18n("core", ["[ [NO_PHOTOS] ]", "[ [1_PHOTO] ]", "[ [N_PHOTOS] ]"], 1)
 * // returns "1 photo"
 *
 * i18n("core", ["[ [NO_PHOTOS] ]", "[ [1_PHOTO] ]", "[ [N_PHOTOS] ]"], 2)
 * // returns "2 photos"
 */
function i18n(module, text) {

    if (text instanceof Array) {
        if (arguments[2] == 0) {
            text = text[text.length == 2 ? 1 : 0];
        } else if (arguments[2] == 1) {
            text = text[text.length == 2 ? 0 : 1];
        } else {
            text = text[text.length == 2 ? 1 : 2];
        }
    }

    for (var j = 2; j < arguments.length; j++) {
        var parts = text.split("%" + (j - 1));
        text = parts.join(arguments[j]);
    }
    return text;
}

/**
 * Decode a normal js string to a html escaped one (with &gt; etc)
 * which can be used to put into innerHTML fields.
 */
function htmlEncode(value) {

    return $("<div/>").text(value).html();
}

/**
 * Decode html encoded string to a normal js string
 */
function htmlDecode(value) {

      return $("<div/>").html(value).text();
}
