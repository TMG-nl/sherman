/**
 * Returns the translation for a specific text key.
 *
 * @param module Name of the module in which the text key is defined. Note that
 *               if the text key is not found in the module, any prerequisite
 *               modules of this module are searched as well.
 * @param textKey The text key for which to get the translation, or optionally
 *                an array containing two or three text keys (see below).
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
 * @example
 * i18n("core", "HOME")
 * // returns "Home"
 *
 * i18n("core", "FRIEND_ADDED", "Nick Cave")
 * // returns "Nick Cave has been added to your friends!"
 *
 * i18n("core", ["NO_PHOTOS", "1_PHOTO", "N_PHOTOS"], 0)
 * // returns "No photos"
 *
 * i18n("core", ["NO_PHOTOS", "1_PHOTO", "N_PHOTOS"], 1)
 * // returns "1 photo"
 *
 * i18n("core", ["NO_PHOTOS", "1_PHOTO", "N_PHOTOS"], 2)
 * // returns "2 photos"
 */
function i18n(module, textKey) {

    if (textKey instanceof Array) {
        if (arguments[2] == 0) {
            textKey = textKey[textKey.length == 2 ? 1 : 0];
        } else if (arguments[2] == 1) {
            textKey = textKey[textKey.length == 2 ? 0 : 1];
        } else {
            textKey = textKey[textKey.length == 2 ? 1 : 2];
        }
    }

    var text = Modules[module].translations[textKey];
    if (text === undefined && Modules[module].dependencies) {
        for (var i = 0; i < Modules[module].dependencies.length; i++) {
            var prerequisite = Modules[Modules[module].dependencies[i]];
            if (prerequisite && prerequisite.translations.hasOwnProperty(textKey)) {
                text = prerequisite.translations[textKey];
                break;
            }
        }
    }
    for (var j = 2; j < arguments.length; j++) {
        var parts = text.split("%" + (j - 1));
        text = parts.join(arguments[j]);
    }
    return text;
}
