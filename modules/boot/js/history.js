/**
 * @class
 *
 * <h2>The History System.</h2>
 *
 * <p>The History system manages the history and can detect when the user
 * navigates back to a previous or future page.</p>
 *
 * <p>Note: You should never have to use the History class directly, since it's
 * entirely encapsulated by the {@link Tiles} class.</p>
 *
 * @param historyParams
 */
function History(historyParams) {

    var SENTINAL_HASH = "000000000000";

    var currentHash = SENTINAL_HASH;

    // TODO: historyItems can grow without bounds, at some point gc to max allowed items
    var historyItems = {};

    // try to keep a shadow history of the real browser history,
    // this is because we cannot get at the real browser history
    // this way we can:-)
    var history = [];
    var currentIndex = 0;

    var addItemsInProgress = 0;

    var baseLocation;
    var queryString;

    function init() {

        //location.hash = currentHash;
        historyItems[currentHash] = null;
        history = [currentHash];

        var url = location.href;
        var index = url.indexOf("/hybrid");
        if (index > 0) {
            baseLocation = url.substr(0, index) + "/hybrid";
            queryString = location.search;
        }

        if (useHtml5HistoryApi()) {
            window.addEventListener("popstate", onhashchange, false);
        } else {
            $(window).hashchange(onhashchange);
        }
    }

    /**
     * Returns true if HTML5 History is supported.
     */
    function useHtml5HistoryApi() {

        return UserAgent.supports("html5History") && baseLocation;
    }

    /**
     * Adds an item to the history.
     *
     * <p>All future items in the history (possibly none) are replaced by the
     * new item. The new item becomes the current item.
     *
     * @param item
     * @param hash
     *
     * @public
     */
    function add(item, hash) {

        hash = hash || randomHash();

        historyItems[hash] = item;

        // update shadow history
        currentIndex++;
        history.splice(currentIndex, history.length - currentIndex, hash);

        if (useHtml5HistoryApi()) {
            if (hash.substr(0, 1) != "/") {
                hash = "/" + hash;
            }
            window.history.pushState(null, null, baseLocation + hash + queryString);
            addItemsInProgress++;
            onhashchange();
        } else {
            if (location.hash.substr(1) != hash) {
                addItemsInProgress++;
                location.hash = hash; // on some platforms, this immediately triggers
                return;               // onhashchange, before the method is finished
            }
        }
    }

    function onhashchange() {

        var newHash;
        if (useHtml5HistoryApi()) {
            newHash = location.href.substring(baseLocation.length);
            if (!historyItems.hasOwnProperty(newHash) && newHash.substr(0, 1) === "/") {
                newHash = newHash.substr(1);
            }
        } else {
            newHash = location.hash.substr(1);
        }

        var prevHash = currentHash;
        currentHash = newHash;

        // if we have added the item ourselves, we don't call the changeListener
        // and currentIndex is already set correctly in add()
        if (addItemsInProgress > 0) {
            addItemsInProgress--;
            return;
        }

        // we use our shadow history to figure out if we are going back or forward
        var direction = (newHash == history[currentIndex - 1] ? "back" : "forward");

        // the hash could have come from anywhere
        // search the history in order to update the currentIndex properly
        for (var i = history.length - 1; i >= 0; i--) {
            if (history[i] == newHash) {
                currentIndex = i;
                break;
            }
        }

        if (newHash != SENTINAL_HASH && newHash != prevHash) {
            if (historyParams.changeListener) {
                try {
                    var prevItem = historyItems[prevHash];
                    var changeListenerParams = {
                        "direction": direction,
                        "prevItem": prevItem,
                        "newHash": newHash,
                        "fromHistory": true
                    };
                    historyParams.changeListener(historyItems[newHash], changeListenerParams);
                } catch(exception) {
                    logging.exception("unhandled exception in history change listener", exception);
                }
            }
        }
    }

    /**
     * Returns the item associated with history entry at delta from the current
     * position. So calling this with -1 will get the previous entry.
     *
     * @public
     */
    function getItem(delta) {

        var index = currentIndex + delta;
        if (index > 0 && index < history.length) {
            var hash = history[index];
            return historyItems[hash];
        } else {
            return undefined;
        }
    }

    /**
     * Returns an array of items starting at index start (0 is the sentinal
     * hash) up to, but not including, end.
     *
     * <p>If you specify 0 or a negative value for end, the absolute value of
     * end will be added to the current index. So, you can specify -1 to get
     * items up to and including the current entry.
     *
     * @public
     */
    function getItems(start, end) {

        if (end <= 0) {
            end = currentIndex - end;
        }
        if (end <= start) {
            return [];
        }

        var items = [];
        for (var i = start; i < end; i++) {
            var hash = history[i];
            items.push(historyItems[hash]);
        }

        return items;
    }

    /**
     * Navigates back to the previous page.
     *
     * @public
     */
    function back() {

        if (currentIndex > 0) {
            if (UserAgent.isSafari() || UserAgent.isIOS()) {
                // Safari has a weird bug that causes back
                // navigation to be screwed up from time to time, so just set
                // the right hash ourselves
                // also affect UIWebViews on iOS
                var newHash = history[currentIndex - 1];
                location.hash = newHash;
            } else {
                window.history.back();
            }
        }
    }

    /**
     * Navigates to a page in the history.
     *
     * @param delta Delta of the page to go to relative to the current page in
     *              the history. A delta of -1 means to go back to the previous
     *              page (same as back()), and a delta of 1 means to go forward
     *              to the next page.
     *
     * @public
     */
    function go(delta) {

        if (UserAgent.isSafari() || UserAgent.isIOS()) {
            // iOS (especially iPhone) has a weird bug that causes back
            // navigation to be screwed up from time to time, so just set
            // the right hash ourselves
            // also affects UIWebView on iOS
            currentIndex += delta;
            if (currentIndex < 0) {
                currentIndex = 0;
            } else if (currentIndex >= history.length) {
                currentIndex = history.length - 1;
            }
            var newHash = history[currentIndex];
            location.hash = newHash;
        } else {
            window.history.go(delta);
        }
    }

    /**
     * Unregisters this History instance.
     *
     * @public
     */
    function destruct() {

        if (useHtml5HistoryApi()) {
            window.removeEventListener("popstate", onhashchange);
        } else {
            $(window).unbind("hashchange", onhashchange);
            /*
             * Reset the window hash, so that the current page is excluded from 
             * the history object.
             */
            window.location.hash = "";
        }
    }

    function debug() {

        logging.debug(["history / historyItems / currentIndex", history, historyItems, currentIndex]);
    }

    init();

    return {
        "add": add,
        "getItem": getItem,
        "getItems": getItems,
        "back": back,
        "go": go,
        "destruct": destruct,
        "debug": debug
    };
}
