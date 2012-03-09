/**
 * @class
 *
 * <h2>The Routes System.</h2>
 *
 * <p>The Routes system is responsible for mapping a tile to a path, and vice
 * versa.</p>
 */
var Routes = function() {

    /**
     * Returns the path corresponding to a tile instance.
     *
     * @param tile A tile instance.
     *
     * @return The path corresponding to the tile, or null if the tile does not
     *         define a path.
     */
    function tileToPath(tile) {

        var hashQuery = {};

        if (window.location.hash.indexOf("?") !== -1) {
            // Do not throw away any parameters passed as arguments to the hash
            var search = window.location.hash.substr(window.location.hash.indexOf("?") + 1);
            hashQuery = $.deparam(search);
        }

        hashQuery.s = randomHash();

        if (tile.toPath) {
            return tile.toPath() + "?" + $.param(hashQuery);
        }
        return null;
    }

    /**
     * Maps the current window location to a tile name and optional parameters.
     * Since this could involve loading a module, this is an async method.
     *
     * @return Promise that will be fulfilled with object containing the tile
     *         name and parameters, or null if the path cannot be mapped.
     *
     * @see mapPath()
     */
    function mapWindowLocation() {

        var path;
        var pathname = window.location.pathname;
        var index = pathname.indexOf("/hybrid/");
        if (index >= 0 && pathname.length > index + 8) {
            path = pathname.substring(index + 7);
            index = path.indexOf("#");
            if (index > 0) {
                path = path.substr(0, index);
            }
        } else {
            path = location.hash.substring(1);
        }

        return mapPath(path);
    }

    /**
     * Maps a path to a tile name and optional parameters.
     * Since this could involve loading a module, this is an async method.
     *
     * @param path The path to map.
     *
     * @return Promise that will be fulfilled with object containing the tile
     *         name and parameters, or null if the path cannot be mapped.
     *
     * @example
     * Routes.mapPath("/www-item/1234");
     * // returns { tileName: "WwwItemTile", params: { wwwId: "1234" } }
     */
    function mapPath(path) {

        var mapPromise = Future.promise();
        
        var tileName = pathToTileName(path);
        if (tileName === null) {
            return mapPromise.fulfill(null);
        }
        
        Tiles.loadModuleForTile(tileName)
        .then(function() {
            if (NS[tileName].hasOwnProperty("mapPath")) {
                mapPromise.fulfill({ "tileName": tileName, "params": NS[tileName].mapPath(path) });
            } else {
                mapPromise.fulfill(null);
            }
        }, function(error) {
            mapPromise.fulfill(null);
        });

        return mapPromise;
    }

    function pathToTileName(path) {

        var parts = path.split("/");
        if (parts.length < 2 || parts[0] !== "" || parts[1] === "") {
            return null;
        }

        var tileName = "";
        var dir = parts[1];
        var capital = true;
        for (var i = 0; i < dir.length; i++) {
            if (dir[i] === "-") {
                capital = true;
            } else {
                if (capital) {
                    tileName += dir[i].toUpperCase();
                } else {
                    tileName += dir[i];
                }
                capital = false;
            }
        }

        tileName += "Tile";
        logging.debug("Routes.pathToTileName: ", path, tileName);
        return tileName;
    }

    /**
     * Returns a specific segment from a path.
     *
     * <p>This method is provided for convenience only, and is intended to be
     * used by the mapPath() functions of tiles.
     *
     * @param path The path to get a segment from.
     * @param index Index of the segment to retrieve.
     *
     * @return A path segment, or undefined if the segment does not exist.
     *
     * @example
     * Routes.getPathSegment("/www-item/1234?s=abcdef", 2);
     * // returns "1234"
     */
    function getPathSegment(path, index) {

        return path.split("?")[0].split("/")[index];
    }

    return {
        "tileToPath": tileToPath,
        "mapWindowLocation": mapWindowLocation,
        "mapPath": mapPath,
        "getPathSegment": getPathSegment
    };
}();
