if (!document.head) {
    document.head = document.getElementsByTagName("head")[0];
}

/**
 * @class
 *
 * <h2>The Modules System.</h2>
 *
 * <p>This class tracks which modules are available and provides functionality
 * for loading modules on-demand.</p>
 *
 * <p>Note that since modules are compiled per locale, this class also tracks the
 * current locale.</p>
 */
var Modules = function() {

    var baseUrl;
    var locale = "en_US";
    var moduleConfig = null;

    var pendingCacheables = {};
    var loadingModules = {};
    var availableModules = {};
    var loadedModules = {};
    var pendingPromises = [];

    var RETRY_TIMEOUT = 3142; // ms
    var MAX_RETRIES = 9;
    var retryTimer = null;

    var evil = window[["ev", "al"].join("")];

    /**
     * Configures the module system.
     *
     * <p>You should never have to call this method yourself as it's only called
     * once before the Core module is even loaded.
     *
     * @param baseUrl Base URL to prepend to all the resources.
     * @param locale The current locale to use.
     * @param moduleConfig Object containing all configuration about the
     *                      available modules.
     */
    function config(_baseUrl, _locale, _moduleConfig) {

        baseUrl = _baseUrl;
        locale = _locale;
        moduleConfig = _moduleConfig;

        // remove outdated cached modules
        var name;
        if (window.localStorage) {
            for (name in moduleConfig) {
                if (moduleConfig.hasOwnProperty(name)) {
                    var moduleKey = "mk." + name;
                    if (window.localStorage.hasOwnProperty(moduleKey)) {
                        var moduleContentKey = window.localStorage[moduleKey];
                        if ("mck." + moduleConfig[name][locale] != moduleContentKey) {
                            delete window.localStorage[moduleContentKey];
                            delete window.localStorage[moduleKey];
                        }
                    }
                }
            }
        }

        for (name in pendingCacheables) {
            if (pendingCacheables.hasOwnProperty(name)) {
                cacheModule(name, pendingCacheables[name]);
            }
        }
    }

    /**
     * Loads one or more modules.
     *
     * @param modules A module name, or an array of module names.
     *
     * @return A promise object that's fulfilled when the module(s) are loaded,
     *         or failed if the modules cannot be loaded.
     *
     * <p>Note, if loading of the module fails and the module has been marked
     * essential in the module's manifest file, Hybrid will consider this a
     * complete failure and offer the user to restart (but the promise will
     * never fail).
     *
     * <p>If the module(s) are already loaded, this method simply returns a
     * fulfilled promise.
     *
     * <p>Warning: Don't assume when loading a module its dependencies will be
     * automatically loaded as well. Hybrid will make a best effort to do so,
     * but not give you any promise.
     *
     * @example
     * Modules.load("chat")
     * .then(function() {
     *     Chat.init(chatConfig);
     * });
     */
    function load(modules) {

        if (!(modules instanceof Array)) {
            modules = [modules];
        }

        var modulesToLoad = [];
        var name;
        for (var i = 0; i < modules.length; i++) {
            name = modules[i];

            if (loadedModules.hasOwnProperty(name)) {
                // module already loaded
                continue;
            }

            if (availableModules.hasOwnProperty(name)) {
                // module already available, so load immediately
                evaluateModule(name);
                continue;
            }

            if (window.localStorage) {
                var moduleKey = "mk." + name;
                if (window.localStorage.hasOwnProperty(moduleKey)) {
                    var moduleContentKey = window.localStorage[moduleKey];
                    if (window.localStorage.hasOwnProperty(moduleContentKey)) {
                        // module in cache, so make available & load immediately
                        availableModules[name] = window.localStorage[moduleContentKey];
                        evaluateModule(name);
                        continue;
                    }
                }
            }

            modulesToLoad.push(modules[i]);
        }

        if (modulesToLoad.length === 0) {
            return Future.promise().fulfill();
        }

        for (var j = 0; j < modulesToLoad.length; j++) {
            name = modulesToLoad[j];
            if (loadingModules.hasOwnProperty(name)) {
                continue;
            }

            createScriptElementForModule(name);

            // the retries property is there to count the number of retries.
            // every module that fails to load is retried a maximum of
            // MAX_RETRIES times.
            // the chains array contains names of modules that should be
            // automatically evaluated immediately after this module has been
            // evaluated. this is used to ensure modules are evaluated in-order
            // even when they are received out-of-order over the network or from
            // the cache
            loadingModules[name] = { "retries": 0, "chains": [] };

            startRetryTimer();
        }

        var promise = Future.promise();
        pendingPromises.push([ modulesToLoad, promise ]);
        return promise;
    }

    function createScriptElementForModule(name) {

        var resource = getResourceForModule(name);
        var element = document.createElement("script");
        element.type = "text/javascript";
        element.src = baseUrl + "/" + resource;
        document.head.appendChild(element);
    }

    function removeScriptElementForModule(name) {

        var resource = getResourceForModule(name);
        var src = baseUrl + "/" + resource;
        document.head.removeChild(document.head.querySelector("*[src='" + src + "']"));
    }

    function getResourceForModule(name) {

        var resources = moduleConfig[name];
        if (!resources) {
            return failModule(name, new Error("Module is not configured"));
        }

        var resource = resources[locale];
        if (!resource) {
            return failModule(name, new Error("Module has no resource(s) for locale " + locale));
        }

        return resource;
    }

    /**
     * Adds a module to the module system.
     *
     * @param name Name of the module to add.
     * @param body JavaScript body of the module, given as a string.
     *
     * <p>When the module that is added was requested through the load() method,
     * the body will immediately be evaluated and the module will be marked as
     * loaded.
     *
     * <p>You should never have to call this method yourself as the build system
     * will generate all the calls to this method per module.
     */
    function addModule(name, body) {

        try {
            availableModules[name] = body;

            if (loadingModules.hasOwnProperty(name)) {
                evaluateModule(name);
            }

            if (moduleConfig) {
                cacheModule(name, body);
            } else {
                pendingCacheables[name] = body;
            }
        } catch(exception) {
            failModule(name, exception);
        }
    }

    function cacheModule(name, body) {

        if (window.localStorage) {
            var resource = moduleConfig[name][locale];
            var moduleKey = "mk." + name;
            var moduleContentKey = "mck." + resource;
            window.localStorage[moduleKey] = moduleContentKey;
            window.localStorage[moduleContentKey] = body;
        }
    }

    /**
     * Evaluates and enables an available module.
     *
     * <p>You should never have to call this method yourself as the build system
     * will generate all the calls to this method per module.
     *
     * @param name Name of the module to enable
     *
     * @see enableModule()
     */
    function evaluateModule(name) {

        if (!availableModules.hasOwnProperty(name)) {
            return failModule(name, new Error("Module " + name + " is not available"));
        }

        // this assumes only one prerequisite was not ready yet (which is true
        // at the time of writing), but loading more than 2 inter-dependent
        // modules at the same time can lead to undefined behavior
        var prerequisitesReady = true;
        for (var i = 0; i < moduleConfig[name].dependencies.length; i++) {
            var prerequisite = moduleConfig[name].dependencies[i];
            if (!loadedModules.hasOwnProperty(prerequisite)) {
                if (!loadingModules.hasOwnProperty(prerequisite)) {
                    load([prerequisite]); // this is a best effort only.
                                   // if we fail here, you'll never know
                }
                if (loadingModules.hasOwnProperty(prerequisite)) {
                    loadingModules[prerequisite].chains.push(name);
                    prerequisitesReady = false;
                }
            }
        }
        if (prerequisitesReady) {
            evil(availableModules[name]);
            delete availableModules[name];

            enableModule(name);
        }
    }

    /**
     * Enables a module.
     *
     * <p>You should never have to call this method yourself as the build system
     * will generate all the calls to this method per module.
     *
     * @param name Name of the module to enable
     */
    function enableModule(name) {

        // enable the CSS included in the module
        var css = Modules[name].css;
        if (css) {
            var element = document.createElement("style");
            element.type = "text/css";
            element.textContent = css;
            document.head.appendChild(element);
        }

        loadedModules[name] = true;
        if (loadingModules.hasOwnProperty(name)) {
            var chains = loadingModules[name].chains;
            delete loadingModules[name];
            for (var i = 0; i < chains.length; i++) {
                evaluateModule(chains[i]);
            }
        }

        stopRetryTimer();

        dismissPromise(name, true);
    }

    function dismissPromise(name, fulfill) {

        for (var i = 0; i < pendingPromises.length; i++) {
            var modulesToLoad = pendingPromises[i][0];
            var moduleIndex = modulesToLoad.indexOf(name);
            if (moduleIndex > -1) {
                var promise = pendingPromises[i][1];
                if (fulfill) {
                    modulesToLoad.splice(moduleIndex, 1);
                    if (modulesToLoad.length === 0) {
                        promise.fulfill();

                        pendingPromises.splice(i, 1);
                        i--;
                    }
                } else {
                    promise.fail();
                    pendingPromises.splice(i, 1);
                    i--;
                }
            }
        }
    }

    function startRetryTimer() {

        if (!retryTimer) {
            retryTimer = setInterval(retryLoadingModules, RETRY_TIMEOUT);
        }
    }

    function stopRetryTimer() {

        if (retryTimer && Object.keys(loadingModules).length === 0) {
            clearInterval(retryTimer);
            retryTimer = null;
        }
    }

    function retryLoadingModules() {

        for (var name in loadingModules) {
            if (loadingModules.hasOwnProperty(name)) {
                var retries = loadingModules[name].retries;
                if (retries < MAX_RETRIES) {
                    removeScriptElementForModule(name);
                    createScriptElementForModule(name);
                    loadingModules[name].retries++;
                } else {
                    failModule(name);
                }
            }
        }
    }

    /**
     * Marks a module as failed (because it wasn't loaded, couldn't be
     * evaluated, or some other reason).
     *
     * <p>You should never have to call this method yourself as the build system
     * will generate all the calls to this method per module.
     *
     * @param name Name of the module to fail
     * @param exception Optional exception that caused the module to fail.
     */
    function failModule(name, exception) {

        logging.debug("Fail module", name);
        if (moduleConfig[name].essential) {
            var message = "Module " + name + " could not be loaded";
            if (exception) {
                message += ": " + exception;
            }
            loadingModules = {};
            stopRetryTimer();
            giveUp(new Error(message));
        } else {
            dismissPromise(name, false);
        }
    }

    /**
     * Returns the URL to a static resource.
     *
     * <p>Examples of static resources could be images or Flash objects.
     *
     * @param moduleName Name of the module that contains the static resource.
     * @param resource Path identifying the resource.
     *
     * @return The URL to the static resource.
     */
    function getStaticUrl(moduleName, resource) {

        return baseUrl + "/" + Modules[moduleName].statics[resource];
    }

    /**
     * Returns the current locale.
     *
     * @return A string identifying the current locale. Currently either "nl_NL"
     *         or "en_US".
     */
    function currentLocale() {

        return locale;
    }

    return {
        "config": config,
        "load": load,
        "addModule": addModule,
        "evaluateModule": evaluateModule,
        "enableModule": enableModule,
        "failModule": failModule,
        "getStaticUrl": getStaticUrl,
        "currentLocale": currentLocale
    };
}();

Modules.boot = {};
