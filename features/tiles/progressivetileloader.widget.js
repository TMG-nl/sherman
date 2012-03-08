/**
 * @class
 *
 * <h2>Utility widget for progressively loading tiles.</h2>
 *
 * <p>When a tile is instantiated, it is asked to realize itself (and display
 * some content in the process) right away. This can be unwieldy since in many
 * cases the tile has had no chance to fetch any or all of its data yet. For
 * these cases, you can use the ProgressiveTileLoader widget which makes it easy
 * to show more and more content as it becomes available. A loading indicator
 * will be displayed as well, until all content is ready.</p>  
 *
 * @param container DOM element of the container in which the tile will be
 *                   shown.
 */
function ProgressiveTileLoader(container) {

    var indicator = null; // use show() to show the indicator

    var finished = false;

    var spinner = null; // instance of Spinner widget
    
     /**
     * Prepends content to the tile's container.
     * 
     * <p>Meanwhile, the loading indicator stays active in anticipation for more
     * content later on.
     *
     * <p>Note: it's perfectly fine to prepend initial content before you show
     * the widget using the show() method.
     *
     * @param content The content to prepend to the tile.
     */
    
    function prepend(content) {
        
        $(content).prependTo($(container));
    }

    /**
     * Adds some content to the tile.
     * 
     * <p>Meanwhile, the loading indicator stays active in anticipation for more
     * content later on.
     *
     * <p>Note: it's perfectly fine to append initial content before you show
     * the widget using the show() method.
     *
     * @param content The content to add to the tile.
     */
    function append(content) {

        if (indicator !== null) {
            $(content).insertBefore(indicator);
        } else {
            $(container).append(content);
        }
    }

    /**
     * Adds the final content to the tile.
     *
     * <p>The tile is now completely loaded, and the loading indicator will be
     * removed.
     *
     * <p>For convenience, this method will issue a FLML.fetchMedia() call for
     * you.
     *
     * @param content Optional final content to add to the tile. If you do not
     *                provide any more content, it just removes the loading
     *                indicator.
     *
     * @see FLML.fetchMedia()
     */
    function finish(content) {

        if (spinner !== null) {
            spinner.stop();
            spinner = null;
        }
        if (indicator !== null) {
            indicator.remove();
            indicator = null;
        }
        if (content) {
            $(container).append(content);
        }

        FLML.fetchMedia(container);

        finished = true;
    }

    /**
     * Shows the initial loader.
     *
     * <p>You should call this method when you want to show the loading
     * indicator, and preferably after you've added all initial content.
     */
    function show() {

        if (finished) {
            return;
        }

        // on BlackBerry we skip the spinner for performance
        var spinnerNode = (UserAgent.isBlackBerry() ? "" : "<canvas class=\"spinner js-spinner\"></canvas> ");

        $(container).append($("<div>").addClass("load-more")
                            .html("<div class=\"load-action\">" + spinnerNode + "[[LOADING]]</div>"));
        indicator = $(".load-more:last", container);

        spinner = Spinner($(".js-spinner", indicator));
        spinner.start();
    }

    return {
        "append": append,
        "prepend": prepend,
        "finish": finish,
        "finished": function() {
            return finished;
        },
        "show": show
    };
}
