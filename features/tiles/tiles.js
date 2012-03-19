/**
 * @class
 *
 * <h2>The Tiles system.</h2>
 *
 * <p>This class provides the public Tiles API and is responsible for managing
 * the tile containers and tile instances and encapsulates the History
 * system.</p>
 */
var Tiles = function() {

    var invalidationStrategy = null;

    var lastActivatedTileName;

    var tileCache;
    var modalLevel;
    var containers = [];

    var history;

    // if not null this promise will be fulfilled once a full history.back is done
    var backPromise = null;

    var transitionStartListeners = [];

    /**
     * Resets the tile system.
     *
     * <p>All instantiated tiles and all registered containers will be
     * destroyed, the history will be reset, and the invalidation strategy will
     * be reset.
     *
     * <p>After calling this method, the state of the tile system will be just
     * like it was again at the start of the application.
     */
    function reset() {

        invalidationStrategy = InvalidationStrategies.TIMEOUT;

        for (var tileKey in tileCache) {
            if (tileCache.hasOwnProperty(tileKey)) {
                var tileEntry = tileCache[tileKey];
                if (tileEntry.tile.destruct) {
                    tileEntry.tile.destruct();
                }
            }
        }
        tileCache = {};

        modalLevel = 0;

        for (var i = 0; i < containers.length; i++) {
            if (containers[i].params.destruct) {
                containers[i].params.destruct();
            }
        }
        containers = [];

        logging.debug("init history");
        if (history) {
            history.destruct();
        }
        history = new History({
            changeListener: function(item, changeListenerParams) {
                Routes.mapPath(changeListenerParams.newHash)
                .then(function(route) {
                    if (item) {
                        activateTile(item.container, item, changeListenerParams);
                    } else if (route) {
                        logging.debug("Opening " + route.tileName);
                        item = {
                            "name": route.tileName,
                            "params": route.params,
                            "data": null,
                            "modal": false,
                            "modalLevel": modalLevel
                        };
                        var targetContainer = getTargetContainerForElement(null, route.tileName) || containers[0];
                        activateTile(targetContainer, item, { "direction": "forward", "hash": changeListenerParams.newHash });
                    }

                    if (changeListenerParams.direction === "back") {
                        if (changeListenerParams.prevItem.promise) {
                            var prevTileKey = getTileKey(changeListenerParams.prevItem);
                            var prevTileEntry = tileCache[prevTileKey];
                            if (prevTileEntry) {
                                changeListenerParams.prevItem.promise.fulfill(prevTileEntry.tile);
                                modalLevel--;
                            }
                        }

                        invalidationStrategy();

                        // finally fulfill the backpromise exposed via Tiles.back()
                        if (backPromise !== null) {
                            backPromise.fulfill();
                            backPromise = null;
                        }
                    }
                });
            }
        });

        transitionStartListeners = [];
    }

    /**
     * Sets the invalidation strategy to use.
     *
     * @param invalidationStrategy The strategy to use.
     *
     * <p>The invalidation strategy determines how tiles which are not currently
     * in the active stack (the part of the history from the home tile to the
     * current tile) should be invalidated.
     *
     * <p>The following strategies are defined:
     *
     * <ul>
     *   <li><strong>Tiles.InvalidationStrategies.TIMEOUT</strong><br>
     *     When a tile is no longer in the active stack it will be
     *     invalidated if it's not visited again within a specific amount
     *     of time.</li>
     *
     *   <li><strong>Tiles.InvalidationStrategies.DIRECT</strong><br>
     *     Any tile that is not in the active stack will be immediately
     *     invalidated.</li>
     * </ul>
     *
     * <p>It is also possible to specify a custom function that implements an
     * invalidation strategy.
     *
     * <p>The default strategy is the TIMEOUT strategy.
     */
    function setInvalidationStrategy(_invalidationStrategy) {

        invalidationStrategy = _invalidationStrategy;
    }

    /**
     * Adds a new tile container.
     *
     * @param name Name of the container. Should be unique.
     * @param element DOM element that will contain all tiles shown inside the
     *                container.
     * @param params Parameters of the container. This will usually contain many
     *               callback functions that define the behavior of the
     *               container. All parameters are optional though, and it is
     *               also allowed to add custom parameters which will be ignored
     *               by the Tiles system, but may be used elsewhere.
     *
     * <p>The following is an overview of callbacks and properties which may be
     * passed through the params argument:
     *
     * <dl>
     *   <dt><strong>transitionStart(transitionParams)</strong></dt>
     *   <dd>The transitionStart() function will be called when a new tile
     *     transition is started. At this point the tile itself still needs to
     *     be instantiated.</dd>
     *
     *   <dt><strong>transitionEnd(transitionParams)</strong></dt>
     *   <dd>The transitionEnd() function will be called when a tile transition
     *     is being completed. At this point the tile has been instantiated and
     *     realized.</dd>
     *
     *   <dt><strong>updateTitle(title)</strong></dt>
     *   <dd>This function is called to notify the container of the title of the
     *     current tile. If your container displays the title of the current
     *     tile in some way, you should implement this function.</dd>
     *
     *   <dt><strong>getTargetContainer(element, tileName)</strong></dt>
     *   <dd>Whenever showTile() is called from the context of this container
     *     (this is determined by checking whether showTile()'s element argument
     *     is contained inside the container element), getTargetContainer() is
     *     called to see in which container the new tile should be shown.<br>
     *     <br>
     *     getTargetContainer() can return the following values:<br>
     *     <strong>null:</strong> Refuse to show the tile.<br>
     *     <strong>true:</strong> Open tile in the same container.<br>
     *     <strong>false:</strong> Let parent container determine the target
     *       container.<br>
     *     <strong>string:</strong> Open tile in the container with the given
     *       name.<br>
     *     <strong>element:</strong> Open tile in the container that contains
     *       the given DOM element.<br>
     *     <br>
     *     If you do not implement this method, the new tile will be shown in
     *     the same container.</dd>
     *
     *   <dt><strong>getScrollContainer()</strong></dt>
     *   <dd>Called to retrieve the element that contains all scrolling content
     *     of the container. If the container does not implement scrolling, you
     *     don't need to implement this method. If you do, it should return a
     *     DOM node.</dd>
     *
     *   <dt><strong>destruct()</strong></dt>
     *   <dd>This function is called when the container is removed, f.e. as a
     *     result of a call to removeContainer() or reset().</dd>
     *
     *   <dt><strong>useHistory</strong></dt>
     *   <dd>Boolean value determining whether the container should participate
     *     in the history.</dd>
     * </dl>
     *
     * @return The new container object.
     *
     * @see removeContainer(), showTile(), showTileInContainer()
     */
    function addContainer(name, element, params) {

        var container = {
            "name": name,
            "element": element,
            "params": params,
            "getTargetContainer": function(element, tileName) {
                // this method is a wrapper around the optional
                // getTargetContainer() method specified by the caller. it makes
                // sure showTile() can always call getTargetContainer() whether
                // it was specified or not, and converts the returned DOM
                // elements to containers.
                var targetContainer = params.getTargetContainer ?
                                      params.getTargetContainer(element, tileName) : true;
                if (targetContainer === true) {
                    return container;
                } else if (targetContainer === null || targetContainer === false ||
                            typeof targetContainer === "string") {
                    return targetContainer;
                } else {
                    return getContainerForElement(targetContainer);
                }
            }
        };

        if (UserAgent.supports("scrollability")) {
            initScrollability(container);
        }

        containers.push(container);
        logging.debug("container added: " + name);
        return container;
    }

    function initScrollability(container) {

        if (container.params.getScrollContainer) {
            var scrollElement = container.params.getScrollContainer();
            $("html").addClass("scrollability");
            $(scrollElement).css({ "overflow": "hidden" });
        }
    }

    /**
     * Removes a specific tile container.
     *
     * @param name Name of the container to remove.
     */
    function removeContainer(name) {

        for (var i = 0; i < containers.length; i++) {
            var container = containers[i];
            if (container.name === name) {
                if (container.params.destruct) {
                    container.params.destruct();
                }
                containers.splice(i, 1);
                return;
            }
        }

        logging.debug("Sorry, couldn't find the container to remove: " + name + " (guess it's ok then...)");
    }

    /**
     * Returns the container specified by name.
     *
     * @param name Name of the container to return.
     *
     * @return The container, or null if no container was found by that name.
     *
     * <p>The returned container will have the following properties set:
     *
     * <dl>
     *   <dt><strong>name</strong></dt>
     *   <dd>The name of the container.</dd>
     *
     *   <dt><strong>element</strong></dt>
     *   <dd>The container element, as given in the call addContainer().</dd>
     *
     *   <dt><strong>params</strong></dt>
     *   <dd>The original parameters given to addContainer().</dd>
     * </dl>
     */
    function getContainerByName(name) {

        for (var i = 0; i < containers.length; i++) {
            if (containers[i].name === name) {
                return containers[i];
            }
        }
        return null;
    }

    /**
     * Shows a tile.
     *
     * @param element A DOM element that specifies the context in which the tile
     *                should be opened. If element is null or the element can
     *                not be associated with an existing container, the default
     *                container becomes responsible for assigning a container to
     *                the tile.
     * @param tileName The name of a tile.
     * @param params Optional parameters passed to the tile.
     * @param data Optional data passed to the tile.
     *
     * <p>The difference between params and data is that params is used as part
     * of the tile key, whereas data is not. The result of this is that when
     * showTile() is called twice with identical tile name and parameters, the
     * first instance of the tile will be reused for the second call, regardless
     * of the data specified in the second call. Because of this, data is also
     * more suitable for passing large amounts of data, since it will be never
     * be JSON-encoded into the tile key.
     *
     * @return true if the tile was shown properly, or false when showing of the
     *      tile was rejected.
     *
     * @see showTileInContainer(), pushModalTile()
     */
    function showTile(element, tileName, params, data) {

        var targetContainer = getTargetContainerForElement(element, tileName);
        return showTileInContainer(targetContainer, tileName, params, data);
    }

    /**
     * Get the targetContainer (not the source container) for a tile based on
     * the element that was involved in the event and the name of the tile.
     *
     * If there was no element involved in the event, just pass null and this
     * function will figure it out itself (still needs a tileName though).
     *
     * @param element HTMLElement that is involved in the event.
     * @param tileName string name of the tile to find the targetContainer for.
     *
     * @return The target container or false if no container could be found.
     */
    function getTargetContainerForElement(element, tileName) {

        // this one probably needs some explanation... ;)
        // in order to determine the container in which the tile will be shown
        // we first determine the source container (where the click or action
        // that triggered the showing of the tile originated). this container
        // is determined by the element argument. if element is null, or not
        // within a known container, the "default" container will be used, ie.
        // the container that was first registered (usually by the frontend).
        // the source container can optionally have a getTargetContainer()
        // method, which gets the final call about where the tile will be shown.
        // for details about getTargetContainer(), see the documentation of
        // addContainer().
        var sourceContainer, targetContainer;
        do {
            sourceContainer = getContainerForElement(element);
            targetContainer = sourceContainer.getTargetContainer(element, tileName);
            if (targetContainer === null) {
                return false;
            }

            if (targetContainer === false) {
                if (sourceContainer === containers[0]) {
                    // this is not good, the default container cannot delegate
                    // to its parent as there is none (and continuing would
                    // result in an infinite loop). no other choice but to deny
                    // the request...
                    return false;
                }
                element = sourceContainer.element.parentNode;
            }
        } while (targetContainer === false);

        if (typeof targetContainer == "string") {
            targetContainer = getContainerByName(targetContainer);
        }

        return targetContainer;
    }

    /**
     * Shows a tile in a specific container.
     *
     * @param targetContainer The container in which the tile should be shown.
     * @param tileName The name of a tile.
     * @param params Optional parameters passed to the tile.
     * @param data Optional data passed to the tile.
     *
     * <p>The difference between params and data is that params is used as part
     * of the tile key, whereas data is not. The result of this is that when
     * showTileInContainer() is called twice with identical tile name and
     * parameters, the first instance of the tile will be reused for the second
     * call, regardless of the data specified in the second call. Because of
     * this, data is also more suitable for passing large amounts of data, since
     * it will be never be JSON-encoded into the tile key.
     *
     * @see showTile(), pushModalTile()
     */
    function showTileInContainer(targetContainer, tileName, params, data) {

        lastActivatedTileName = tileName;

        if (typeof targetContainer === "string") {
            var containerName = targetContainer;
            targetContainer = getContainerByName(containerName);
            if (targetContainer === null) {
                logging.debug("Sorry, no container found by the name: " + containerName);
                return false;
            }
        }

        params = (params === undefined) ? {} : (params === false ? { "tileId": Number.randomId(16) } : params);

        var item = { "name": tileName, "params": params, "data": data, "modal": false, "modalLevel": modalLevel };

        return activateTile(targetContainer, item, { "direction": "forward" });
    }

    /**
     * Pushes a tile on top of the modal tile stack.
     *
     * @param tileName The name of a tile.
     * @param params Parameters passed to the tile.
     * @param data Data passed to the tile.
     *
     * <p>The difference between params and data is that params is used as part
     * of the tile key, whereas data is not. The result of this is that when
     * showTile() is called twice with identical tile name and parameters, the
     * first instance of the tile will be reused for the second call, regardless
     * of the data specified in the second call. Because of this, data is also
     * more suitable for passing large amounts of data, since it will be never
     * be JSON-encoded into the tile key.
     *
     * @return A promise that's fulfilled when the tile is dismissed. A
     *         reference to the tile instance will be given as parameter to the
     *         fulfill handler.
     *
     * @see showTile(), showTileInContainer()
     */
    function pushModalTile(tileName, params, data) {

        var promise = Future.promise(); // used to return future value of modal tile

        logging.debug(["pushModalTile", tileName, params, data]);

        params = (params === undefined) ? {} : (params === false ? { "tileId": Number.randomId(16) } : params);

        modalLevel++;

        var backButtonText = (modalLevel > 1 ? "BACK" : "CANCEL");

        var item = {
            "name": tileName,
            "params": params,
            "data": data,
            "modal": true,
            "backButtonText": params.backButtonText || backButtonText,
            "modalLevel": modalLevel,
            "promise": promise
        };

        activateTile(containers[0], item, { "direction": "forward" });

        if (UserAgent.supports("scrollability")) {
            var scrollContainer = $($("#modal").children()[1]);
            scrollContainer.css({ "overflow": "hidden" });
            $(scrollContainer.children()[0]).addClass("scrollable").addClass("vertical");
        }

        return promise;
    }

    /**
     * Returns the scroll container for a given element.
     *
     * <p>Whenever you want to scroll to a specific position or bind to the
     * scroll event, you need to know in which element you are contained that is
     * actually scrolling. In that case this is the method you should use.
     *
     * @param element A DOM element that specifies the context in which you want
     *                to scroll. Any element within your own tile or the tile
     *                container should suffice.
     *
     * @return A DOM node which you can instruct to scroll and on which you
     *         can bind scroll event listeners. May return null if there is no
     *         scrolling support available.
     *
     * <p>Note that if you are binding event listeners to this element, it is
     * your own responsibility to bind and unbind on activate and deactive.
     */
    function getScrollContainer(element) {

        var container;
        do {
            container = getContainerForElement(element);
            if (container.params.getScrollContainer) {
                return container.params.getScrollContainer();
            }

            element = container.element.parentNode;
        } while (container !== containers[0]);

        // the default container can't even scroll, too bad...
        return undefined;
    }

    /**
     * Returns whether we can go back to a previous tile.
     *
     * @return Boolean true if we can go back, boolean false otherwise.
     *
     * @see back()
     */
    function canGoBack() {

        return history.getItems(0, 0).length > 1;
    }

    /**
     * Go back one step in the history, ie. go to the previous tile.
     *
     * <p>If the currently active tile is a modal tile, the tile is dismissed
     * and its tile promise will be fulfilled.
     *
     * <p>Warning: This method does not check whether it's actually possible to
     * go back, and can lead to a race condition if you go past the beginning of
     * the tile stack. Use canGoBack() if you want to be sure.
     *
     * @return A Promise object that's fulfilled when the back action is
     *         completed.
     *
     * @see pushModalTile(), canGoBack()
     */
    function back() {

        backPromise = Future.promise();
        // backpromise might be set to null before this method returns
        var temp = backPromise;
        history.back();
        return temp;
    }

    /**
     * Navigates to a page in the history.
     *
     * <p>Note that if you go back more than one page in the history, and you
     * navigate past modal tiles, the promises of these modal tiles may not get
     * fulfilled.
     *
     * <p>Warning: This method does not check whether it's actually possible to
     * go to the requested page, and can lead to a race condition if you go past
     * the beginning or end of the tile stack.
     *
     * @param delta Delta of the page to go to relative to the current page in
     *              the history. A delta of -1 means to go back to the previous
     *              page (same as back()), and a delta of 1 means to go forward
     *              to the next page.
     */
    function go(delta) {

        history.go(delta);
    }

    /**
     * Retrieves a tile from the TileCache
     *
     * @param tileName Name of the tile to retrieve.
     * @param params Parameters of the tile to retrieve.
     */
    function getTileFromCache(tileName, params) {

        var item = getItem(tileName, params);
        var tileKey = getTileKey(item);
        var tileEntry = tileCache[tileKey];
        return tileEntry;
    }

    /**
     * Removes a tile from the TileCache
     *
     * @param tileName Name of the tile to retrieve.
     */
    function removeTileFromCache(tileName,params) {

        var item = getItem(tileName, params);
        var tileKey = getTileKey(item);
        delete tileCache[tileKey];
    }

    /**
     * Explicitly invalidates a tile.
     *
     * @param tileName Name of the tile to invalidate.
     * @param params Parameters of the tile to invalidate.
     *
     * <p>This method behaves independently from the invalidation strategy, and
     * always invalidates the given tile directly.
     */
    function invalidateTile(tileName, params) {

        var tileEntry = getTileFromCache(tileName, params);
        if (tileEntry) {
            logging.debug("forced invalidating " + tileEntry.name);
            if (tileEntry.tile.destruct) {
                tileEntry.tile.destruct();
            }
            removeTileFromCache(tileName, params);
        }
    }

    /**
     * Explicitly refreshes a tile which is currently displayed.
     *
     * @param tileName Name of the tile to refresh.
     * @param params Parameters of the tile to refresh.
     *
     */
    function refreshTile(tileName, params) {

        var tileEntry = getTileFromCache(tileName, params);
        if (tileEntry) {
            logging.debug("forced refreshing " + tileEntry.name);
            if (tileEntry.tile.refresh) {
                tileEntry.tile.refresh();
            }
            return true;
        }
    }

    /**
     * Instantiates a tile in the background.
     *
     * <p>This method is useful when you want to be sure that a certain tile is
     * instantiated and available, even if you do not want to show it (yet).
     *
     * <p>By default, tile instantiation is a synchronous operation and is
     * performed by calling the synchronousInstantiateTile method.
     * The instantiateTile method is used for asynchronous instantiation
     * and will be called in the following cases:
     * 1. The tile exposes the synchronous property as false
     * 2. The module in which the tile is defined has not been loaded yet, In
     *    which case the module will automatically be loaded. Because this
     *    is an asynchronous operation, a promise will be returned by this
     *    method which will be fulfilled when the module has been loaded.
     *
     * @param tileName The name of a tile.
     * @param params Optional parameters passed to the tile.
     * @param data Optional data passed to the tile.
     * @param promise Optional promise which will be fulfilled when the tile is
     *                dismissed.
     *
     * @return Promise that will be fulfilled when the tile (and its
     *         module/dependencies) has been loaded. The result of the promise
     *         will be the tile instance.
     */
    function instantiateTile(tileName, params, data, promise) {

        var tilePromise = Future.promise();

        loadModuleForTile(tileName)
        .then(function() {
            var tile = synchronousInstantiateTile(tileName, params, data);
            tilePromise.fulfill(tile);
        }, function(error) {
            tilePromise.fail(error);
        });

        return tilePromise;
    }

    /**
     * @private
     *
     * Instantiates tile in synchronous operation.
     * Callee is responsible to load the module containing the tile, if applicable.
     *
     * @param tileName The name of a tile.
     * @param params Optional parameters passed to the tile.
     * @param data Optional data passed to the tile.
     * @param promise Optional promise which will be fulfilled when the tile is
     *                dismissed.
     * @return Tile the instantiated tile
     */
    function synchronousInstantiateTile(tileName, params, data, promise) {

        params = (params === undefined) ? {} : (params === false ? { "tileId": Number.randomId(16) } : params);

        var tileKey = getTileKey({ "name": tileName, "params": params });
        var tileEntry = tileCache[tileKey];

        var tile, realizePromise;

        if (tileEntry) {
            logging.debug("tile cache hit!");
            tile = tileEntry.tile;
        } else {
            if (!NS[tileName]) {
                throw new CoreException("Tile \"" + tileName + "\" is undefined, missing from manifest?");
            }

            var tileDiv = $("<div>");

            tile = NS[tileName](tileDiv[0], params, data);
            tile.realize();

            tile._lastupdated = Date.getUnixTimestamp();

            tileEntry = { "tile": tile, "div": tileDiv, "name": tileName, "promise": promise };
            logging.debug("tile cache miss!");
            tileCache[tileKey] = tileEntry;
        }

        return tile;
    }

    /**
     * Loads the module that contains the tile with the given
     * name. Since this is an async operation, a promise is returned.
     *
     * @param tileName Name of the tile for which its module needs to be loaded
     *
     * @return promise Promise that is fulfilled when the module has been loaded
     *                 or failed when the tile cannot be found.
     */
    function loadModuleForTile(tileName) {

        if (NS[tileName]) { // module containing the tile has already been loaded
            return Future.promise().fulfill();
        }

        var module = Modules.getModuleForTile(tileName);
        if (module !== null) {
            logging.debug("going to load module " + module + " for tile " + tileName);
            return Modules.load(module);
        } else {
            logging.debug("cannot find module for tile " + tileName);
            return Future.promise().fail("Can't find module for tile " + tileName);
        }
    }

    /**
     * Adds a listener to the internal transitionStart event.
     *
     * The transitionStart event occurs every time a tile transition is started
     * in some container. As such, this method allows you to perform some action
     * on the transitions of other container.
     *
     * Note that the use of this method is actually discouraged in order to keep
     * transitions as smooth as possible.
     *
     * @param listener Callback method to call whenever a transitionStart event
     *                 occurs. The callback will receive a single
     *                 transitionParams argument.
     *
     * @see addContainer()
     */
    function addTransitionStartListener(listener) {

        transitionStartListeners.push(listener);
    }

    function debug() {

        logging.debug(["tile cache", tileCache]);

        history.debug();
    }

    function getContainerForElement(element) {

        while (element) {
            for (var i = 0; i < containers.length; i++) {
                if (containers[i].element === element) {
                    return containers[i];
                }
            }

            element = element.parentNode;
        }

        if (containers.length === 0) {
            logging.error("No default tile container is defined, I'm going to crash...");
        }
        return containers[0];
    }

    function getItem(tileName, params) {

        return { "name": tileName, "params": params };
    }

    function getTileKey(historyItem) {

        // TODO: make sure that json always encodes the same for same params
        // e.g. does the JSON encoder always iterate the keys in the same order?
        var tileName = historyItem.name;
        var tileParams = historyItem.params;
        var tileKey = tileName + (tileParams ? ("_" + JSON.stringify(tileParams)) : "");
        return tileKey;
    }

    function transitionStart(container, transitionParams) {

        if (container.params.transitionStart) {
            container.params.transitionStart(transitionParams);
        }

        if (transitionStartListeners.length) {
            transitionParams.container = container;
            for (var i = 0; i < transitionStartListeners.length; i++) {
                transitionStartListeners[i](transitionParams);
            }
        }
    }

    function transitionEnd(container, tileEntry, transitionParams) {

        transitionParams.backCaption = false;
        if (container.params.useHistory) {
            // link with caption for back button
            var historyItem = history.getItem(-1);
            if (historyItem !== undefined) {
                var backTileEntry = tileCache[getTileKey(historyItem)];
                if (backTileEntry !== undefined) {
                    var backTile = backTileEntry.tile;
                    transitionParams.backTileName = backTileEntry.name;
                    transitionParams.backCaption = backTile.title ? (htmlEncode(backTile.title())) : htmlEncode("[[BACK]]");
                }
            }
        }

        transitionParams.div = tileEntry.div;
        transitionParams.tile = tileEntry.tile;
        transitionParams.tileName = tileEntry.name;

        if (UserAgent.supports("scrollability") && !transitionParams.tile.fullScreen && container.params.getScrollContainer && !transitionParams.modal) {
            var scrollable = $(transitionParams.div);
            if (!scrollable.hasClass("scrollable")) {
                // TODO: scrollability breaks MediaUploadTile
                if (transitionParams.tileName !== "MediaUploadTile") {
                    scrollable.addClass("scrollable").addClass("vertical");
                }
            }
        }

        if (container.params.transitionEnd) {
            container.params.transitionEnd(transitionParams);
        }

        if (container.params.updateTitle) {
            container.params.updateTitle(tileEntry.tile.title ? tileEntry.tile.title : "");
        }

        if (tileEntry.tile.activate) {
            logging.debug("Tile.js:tileEntry:", tileEntry, "transitionParams:", transitionParams);
            tileEntry.tile.activate(transitionParams);
        }
    }

    function activateTile(container, item, activationParams) {

        item.container = container;
        logging.debug("activateTile", item, activationParams);

        var transitionParams = { "direction": activationParams.direction, "modal": item.modal, "modalLevel": item.modalLevel, "backButtonText": item.backButtonText };
        transitionStart(container, transitionParams);

        // will be called after we instantiate the tile below
        // makes it easy to implement async and sync tile instantiation strategies
        function afterInstantiateTile(tile) {
            var tileKey = getTileKey(item);
            var tileEntry = tileCache[tileKey];

            if (container.params.useHistory && activationParams.direction === "forward" && !activationParams.fromHistory) {
                history.add(item, activationParams.hash || Routes.tileToPath(tile));
            }
            transitionEnd(container, tileEntry, transitionParams);

            if (window.GapUtility && GapUtility.forceRepaint) {
                GapUtility.forceRepaint();
            }
        }

        if (NS.hasOwnProperty(item.name) && NS[item.name].synchronous !== false) {
            var tile = synchronousInstantiateTile(item.name, item.params, item.data, item.promise);
            afterInstantiateTile(tile);
        } else {
            var instantiateTilePromise = instantiateTile(item.name, item.params, item.data, item.promise);
            instantiateTilePromise.then(function(tile) {
                afterInstantiateTile(tile);
            });
        }

        return true;
    }

    // these constants and variables are specific to the timeoutInvalidationStrategy
    var INVALIDATOR_INTERVAL = 60 * 1000; // msecs
    var INVALIDATION_TIMEOUT = 300; // secs
    var invalidationTimeoutTimer = null;

    function timeoutInvalidationStrategy() {

        if (invalidationTimeoutTimer) {
            return; // invalidator already started
        }

        logging.debug("starting tile invalidator");
        invalidationTimeoutTimer = setInterval(function() {
            // we only invalidate tiles that we cannot navigate back to
            var activeTileEntries = history.getItems(1, -1);
            var activeTileKeys = [];
            for (var i = 0; i < activeTileEntries.length; i++) {
                activeTileKeys.push(getTileKey(activeTileEntries[i]));
            }

            var numEvaluatedTiles = 0;
            var now = Date.getUnixTimestamp();
            for (var tileKey in tileCache) {
                if (tileCache.hasOwnProperty(tileKey)) {
                    var tile = tileCache[tileKey].tile;
                    if (tile.persistent || activeTileKeys.indexOf(tileKey) > -1) {
                        continue;
                    }

                    if ((now - tile._lastupdated) > INVALIDATION_TIMEOUT) {
                        logging.debug("invalidating " + tileCache[tileKey].name);
                        if (tile.destruct) {
                            tile.destruct();
                        }
                        delete tileCache[tileKey];
                    } else {
                        numEvaluatedTiles++;
                    }
                }
            }

            if (numEvaluatedTiles === 0) {
                logging.debug("stopping tile invalidator");
                clearTimeout(invalidationTimeoutTimer);
                invalidationTimeoutTimer = null;
            }
        }, INVALIDATOR_INTERVAL);
    }

    function directInvalidationStrategy() {

        // we only invalidate tiles that we cannot navigate back to
        var activeTileEntries = history.getItems(1, -1);
        var activeTileKeys = [];
        for (var i = 0; i < activeTileEntries.length; i++) {
            activeTileKeys.push(getTileKey(activeTileEntries[i]));
        }

        for (var tileKey in tileCache) {
            if (tileCache.hasOwnProperty(tileKey)) {
                var tileEntry = tileCache[tileKey];
                var tile = tileEntry.tile;
                if (tile.persistent || activeTileKeys.indexOf(tileKey) > -1) {
                    continue;
                }

                logging.debug("invalidating " + tileEntry.name);
                if (tile.destruct) {
                    tile.destruct();
                }
                delete tileCache[tileKey];
            }
        }
    }

    var InvalidationStrategies = {
        TIMEOUT: timeoutInvalidationStrategy,
        DIRECT: directInvalidationStrategy
    };

    function getLastActivatedTileName() {

        return lastActivatedTileName;
    }

    reset();

    return {
        "reset": reset,
        "setInvalidationStrategy": setInvalidationStrategy,
        "addContainer": addContainer,
        "removeContainer": removeContainer,
        "getContainerByName": getContainerByName,
        "showTile": showTile,
        "showTileInContainer": showTileInContainer,
        "pushModalTile": pushModalTile,
        "getScrollContainer": getScrollContainer,
        "canGoBack": canGoBack,
        "back": back,
        "go": go,
        "invalidateTile": invalidateTile,
        "instantiateTile": instantiateTile,
        "addTransitionStartListener": addTransitionStartListener,
        "refreshTile": refreshTile,
        "getTileFromCache": getTileFromCache,
        "debug": debug,
        "getLastActivatedTileName": getLastActivatedTileName,
        "loadModuleForTile": loadModuleForTile,

        // these are used for additional minifying
        "m": pushModalTile,
        "s": showTile,
        "c": showTileInContainer,

        InvalidationStrategies: InvalidationStrategies
    };
}();
