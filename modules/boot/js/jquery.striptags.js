/*
 * A utlity function added to jQuery for stripping tags.
 *
 * @author Ifthikhan Nazeem <iftecan2000@gmail.com>
 */
(function($) {

    $.extend({
        stripTags: function(value) {
            return $("<div/>").html(value).text();
        }
    });

})(jQuery);
