/*
 * Overriding the original jQuery removeClass method to allow removing of classes
 * using regular expressions. If the provided argument type is anything other than
 * a RegExp object type the call is delegated to the original jQuery removeClass
 * method.
 *
 * @author Ifthikhan Nazeem <iftecan2000@gmail.com>
 */
(function($) {

    var old = $.fn.removeClass;

    $.fn.removeClass = function(value) {

        if (value instanceof RegExp) {
            var cls = $(this).attr("class");
            if (!cls) {
                return this;
            }
            
            var classes  = cls.split(/\s+/);
            for (var i = 0; i < classes.length; i++) {
                var className = classes[i];
                if (value.test(className)) {
                    old.call(this, className);
                }
            }
            return this;
        } else {
            return old.apply(this, arguments);
        }
    };
})(jQuery);
