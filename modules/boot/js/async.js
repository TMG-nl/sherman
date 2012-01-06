/**
 * @class
 *
 * <h2>The Future System.</h2>
 *
 * <p>The Future system is a handy JavaScript construct that allows you to
 * perform asynchronous tasks but specify the callbacks in an easy-to-read
 * synchronous fashion.</p>
 */
var Future = function() {

    var state = {
        UNATTACHED: -1,
        UNFULFILLED: 0,
        FULFILLED: 1,
        FAILED: 2,
        CANCELED: 3 // fun fact: canceled is US English, cancelled is British,
                    // but they're often used interchangeably :)
    };

    var globalErrorHandler = function(exception) {

        logging.exception("Future default global error handler", exception);
    };

    /**
     * Sets the global error handler which should be called when a promise for
     * which no error callback is specified is failed.
     *
     * @param errorHandler The callback to register as global error handler. 
     *
     * @public @static
     */
    function setGlobalErrorHandler(errorHandler) {

        globalErrorHandler = errorHandler;
    }

    /**
     * @name Future.Promise
     * @class
     *
     * <h2>A Promise object as returned by {@link Future-promise()}.</h2>
     */
    function Promise() {

        this.result = undefined;
        this.fulfilledHandlers = [];
        this.errorHandlers = [];

        this.state = state.UNATTACHED;
    }

    Promise.prototype.callFulfilled = function(handlers, result) {

        if (handlers.length === 0) {
            return false;
        }

        var i = 0;
        if (logging.isDebug()) {
            for (; i < handlers.length; i++) {
                handlers[i](result);
            }
        } else {
            try {
                for (; i < handlers.length; i++) {
                    handlers[i](result);
                }
            } catch(exception) {
                this.callError(this.errorHandlers, exception);
            }
        }
        return true;
    };

    Promise.prototype.callError = function(handlers, result) {

        handlers = handlers.filter(function (handler) { return handler !== undefined; });
        if (handlers.length === 0) {
            handlers = [globalErrorHandler];
        }

        var i = 0;
        if (logging.isDebug()) {
            for (; i < handlers.length; i++) {
                handlers[i](result);
            }
        } else {
            try {
                for (; i < handlers.length; i++) {
                    handlers[i](result);
                }
            } catch(exception) {
                globalErrorHandler(exception);
            }
        }
        return true;
    };

    /**
     * Registers a success callback and optionally an error callback.
     * 
     * <p>This method can be called multiple times on the same Promise object
     * and for convenience returns the same Promise object again.
     *
     * @param fulfilledHandler The success callback to register.
     * @param errorHandler The error callback to register.
     *
     * @return The Promise object.
     *
     * @public
     * @memberOf Future.Promise.prototype
     */
    Promise.prototype.then = function(fulfilledHandler, errorHandler) {

        var self = this;

        if (this.state === state.UNATTACHED || this.state === state.UNFULFILLED) {
            this.fulfilledHandlers.push(fulfilledHandler);
            this.errorHandlers.push(errorHandler);
            this.state = state.UNFULFILLED;
        } else if (this.state === state.FULFILLED) {
            setTimeout(function() {
                self.callFulfilled([fulfilledHandler], self.result);
            }, 0);
        } else if (this.state === state.FAILED) {
            setTimeout(function() {
                self.callError([errorHandler], self.result);
            }, 0);
        } else if (this.state === state.CANCELED) {
            var makeJsLintHappy = true; // do nothing
        } else {
            throw new Error("invalid state");
        }

        return self;
    };

    /**
     * Fulfills the promise and calls all registered registered success
     * callbacks. The result argument will be passed to the callbacks.
     * 
     * <p>Note that if you call fulfill() first and then call then(), the newly
     * registered callback will still be called with the given result.
     *
     * @param result The result to pass to the success callback(s).
     *
     * @return The Promise object.
     *
     * @public
     * @memberOf Future.Promise.prototype
     */
    Promise.prototype.fulfill = function(result) {

        if (this.state === state.CANCELED) {
            return;
        }

        if (this.state !== state.UNATTACHED && this.state !== state.UNFULFILLED) {
            throw new Error("incorrect state for fulfill: " + this.state);
        }

        this.state = state.FULFILLED;

        if (!this.callFulfilled(this.fulfilledHandlers, result)) {
            this.result = result;
        }

        return this;
    };

    /**
     * Fails the promise and calls all registered error callbacks. The error
     * argument will be passed to the callbacks.
     *
     * <p>Note that when no error callbacks are registered, the global error
     * handler will be called.
     *
     * @param result The result to pass to the error callback(s).
     *
     * @return The Promise object.
     *
     * @public
     * @memberOf Future.Promise.prototype
     */
    Promise.prototype.fail = function(result) {

        if (this.state === state.CANCELED) {
            return;
        }

        if (this.state !== state.UNATTACHED && this.state !== state.UNFULFILLED) {
            throw new Error("incorrect state for fail: " + this.state);
        }

        this.state = state.FAILED;

        if (!this.callError(this.errorHandlers, result)) {
            this.result = result;
        }

        return this;
    };

    /**
     * Cancels the promise.
     *
     * <p>While the actual asynchronous operation cannot be cancelled, calling
     * cancel() will have the effect that upon completion no callbacks will be
     * called at all.
     *
     * @public
     * @memberOf Future.Promise.prototype
     */
    Promise.prototype.cancel = function() {

        if (this.state === state.CANCELED) {
            throw new Error("already canceled");
        }

        this.state = state.CANCELED;
    };

    /**
     * Returns a new promise.
     *
     * @return A {@link Future.Promise} object.
     *
     * @public @static
     */
    function promise() {

        return new Promise();
    }

    return {
        "setGlobalErrorHandler": setGlobalErrorHandler,
        "promise": promise
    };
}();
