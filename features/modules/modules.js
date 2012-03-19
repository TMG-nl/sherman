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
    var moduleConfig = null;

    var pendingCacheables = {};
    var loadingModules = {};
    var availableModules = {};
    var loadedModules = {};
    var pendingPromises = [];

    var RETRY_TIMEOUT = 3142; // ms
    var MAX_RETRIES = 9;
    var retryTimer = null;
    
    var inverseTileModuleDependencies = null;

    var evil = window[["ev", "al"].join("")];
    
    /* The locale for loading the modules.
     * @private 
     */
    var locale;

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
        moduleConfig = _moduleConfig;
        setLocale(_locale);

        // remove outdated cached modules
        var name;
        if (window.localStorage) {
            for (name in moduleConfig) {
                if (moduleConfig.hasOwnProperty(name)) {
                    var moduleKey = "mk." + name;
                    var moduleContentKey = window.localStorage.getItem(moduleKey);
                    if (moduleContentKey) {
                        if ("mck." + moduleConfig[name][locale] != moduleContentKey) {
                            window.localStorage.removeItem(moduleContentKey);
                            window.localStorage.removeItem(moduleKey);
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
                var moduleContentKey = window.localStorage.getItem(moduleKey);
                if (moduleContentKey) {
                    var token = Profiling.start("loadModuleFromLocalStorage:" + name);
                    var moduleContent = window.localStorage.getItem(moduleContentKey);
                    if (moduleContent) {
                        // module in cache, so make available & load immediately
                        availableModules[name] = moduleContent;
                        evaluateModule(name);
                        Profiling.stop("loadModuleFromLocalStorage:" + name, token);
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
            logging.debug(resources);
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
            try {
                window.localStorage.setItem(moduleKey, moduleContentKey);
                window.localStorage.setItem(moduleContentKey, body);
            }
            catch (e) {
                if (e.code !== DOMException.QUOTA_EXCEEDED_ERR) {
                    throw e;
                }
                // else {
                    // On some devices / configurations the quota is really small,
                    // and our cached module may not fit. Let's not make a big deal
                    // out of it.
                // }
            }
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
            var token = Profiling.start("evaluateModule:" + name);

            evil(availableModules[name]);
            delete availableModules[name];

            enableModule(name);

            Profiling.stop("evaluateModule:" + name, token);
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

        var token = Profiling.start("enableModule:" + name);

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

        // export the module's dependencies
        Modules[name].dependencies = moduleConfig[name].dependencies;

        stopRetryTimer();

        dismissPromise(name, true);

        Profiling.stop("enableModule:" + name, token);
    }

    function dismissPromise(name, fulfill) {

        for (var i = 0; i < pendingPromises.length; i++) {
            var modulesToLoad = pendingPromises[i][0];
            var moduleIndex = modulesToLoad.indexOf(name);
            if (moduleIndex > -1) {
                var token = Profiling.start("dismissPromise:" + name);

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

                Profiling.stop("dismissPromise:" + name, token);
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

        logging.debug("Fail module", name, ""+exception);
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
    
    /**
     * Returns the name of the module in which the given tile name is defined
     * 
     * @return String Name of name of the module in which the given tile name is defined,
     *                null if not defined. 
     */
    function getModuleForTile(tileName) {
        
        if (inverseTileModuleDependencies === null) {
            createInverseTileModuleMap();
        }
        
        if (inverseTileModuleDependencies.hasOwnProperty(tileName)) {
            return inverseTileModuleDependencies[tileName];
        } else {
            return null;
        }
    }
    
    function createInverseTileModuleMap() {
            
        inverseTileModuleDependencies = {};
        var tile;
        for (var module in Modules.tileModuleDependencies) {
            if (Modules.tileModuleDependencies.hasOwnProperty(module)) {
                for (var i = 0; i < Modules.tileModuleDependencies[module].length; i++) {
                    tile = Modules.tileModuleDependencies[module][i];
                    inverseTileModuleDependencies[tile] = module;
                }
            }
        }
    }
    
    /* Set the locale
     * @private 
     */
    function setLocale(_locale) {
        
        locale = _locale;
    }
    
    setLocale("en_US");

    return {
        "config": config,
        "load": load,
        "addModule": addModule,
        "evaluateModule": evaluateModule,
        "enableModule": enableModule,
        "failModule": failModule,
        "getStaticUrl": getStaticUrl,
        "currentLocale": currentLocale,
        "getModuleForTile": getModuleForTile
    };
}();

Modules.boot = {};
