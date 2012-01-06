var Events = function() {

    var CLICK_EVENT;

    function targetData(event, selector, attribute) {

        return $(event.target).closest(selector).attr("data-" + attribute);
    }

    function initClickEvent() {

        if (UserAgent.isNokiaContainer()) {
            CLICK_EVENT = "mouseup";
        } else if (UserAgent.isAndroid() && getQueryParam("test") === "1") {
            CLICK_EVENT = "click";
        } else {
            CLICK_EVENT = "vclick";
        }
    }

    initClickEvent();

    return {
        "targetData": targetData,

        KEY_BACKSPACE: 8,
        KEY_TAB:       9,
        KEY_RETURN:   13,
        KEY_ESC:      27,
        KEY_SPACE:    32,
        KEY_LEFT:     37,
        KEY_UP:       38,
        KEY_RIGHT:    39,
        KEY_DOWN:     40,
        KEY_DELETE:   46,
        KEY_HOME:     36,
        KEY_END:      35,
        KEY_PAGEUP:   33,
        KEY_PAGEDOWN: 34,
        KEY_INSERT:   45,
        KEY_TOP:      84, // blackberry
        KEY_BOTTOM:   66, // blackberry
        KEY_SEARCH:   1000,

        CLICK: CLICK_EVENT
    };
}();

// BlackBerry-specific event handling
if (UserAgent.isBlackBerry()) {
    $(document).keypress(function(event) {
        if (event.which == Events.KEY_ESC) {
            event.preventDefault();
            if (!Tiles.canGoBack()) {
                navigator.utility.pause();
            }
        } else if (event.which == Events.KEY_RIGHT) {
            var scrollContainer = Tiles.getScrollContainer(event.target);
            if (scrollContainer) {
                scrollContainer.scrollTop = 0;
            }
        }
    });
}
