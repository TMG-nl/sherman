var Application = function() {

    function init(config) {

        if (UserAgent.isMobileDevice()) {
            $.tmpl("core.mobile-skeleton").appendTo("body");

            setupMobileTileContainer();
        } else {
            $.tmpl("core.desktop-skeleton").appendTo("body");

            setupDesktopTileContainers();
        }

        Tiles.showTile(null, "WelcomeTile");

        attachListeners();
    }
    
    function setupDesktopTileContainers() {

        function createContainer(name) {

            $.tmpl("core.desktop-container", { "containerName": name }).appendTo(".js-container");

            var containerEl = $("#" + name);
            var currentTile = null;
            var childContainer = null;

            return Tiles.addContainer(name, containerEl[0], {
                "transitionEnd": function(transitionParams) {
                    if (childContainer !== null) {
                        childContainer.params.destruct();
                    }

                    containerEl.children().detach();
                    containerEl.append(transitionParams.div);
                    currentTile = transitionParams.tile;
                },
                "updateTitle": setTitle,
                "getTargetContainer": function(element, tileName) {
                    if (currentTile === null) {
                        return true;
                    }
                    
                    if (childContainer !== null) {
                        childContainer.params.destruct();
                    }

                    var childName = "child_" + Number.randomId(6);
                    childContainer = createContainer(childName);
                    return childName;
                },
                "getScrollContainer": function() {
                    return containerEl[0];
                },
                "destruct": function() {
                    containerEl.remove();
                    if (childContainer !== null) {
                        childContainer.params.destruct();
                    }
                },
                "useHistory": true
            });
        }

        createContainer("main");
    }

    function setupMobileTileContainer() {

        var containerEl = $(".js-tile");

        Tiles.addContainer("main", containerEl[0], {
            "transitionEnd": function(transitionParams) {
                containerEl.children().detach();
                containerEl.append(transitionParams.div);
            },
            "updateTitle": setTitle,
            "getScrollContainer": function() {
                return containerEl[0];
            },
            "destruct": function() {
                containerEl.remove();
            },
            "useHistory": true
        });
    }

    function attachListeners() {

        $(document.body).delegate(".action-random-tile", "click", function(event) {
            Tiles.showTile(event.target, "RandomTile", { "id": Number.randomId(6) });
        });
    }

    function setTitle(title) {

        window.title = title;
    }

    return {
        "init": init,
        "setTitle": setTitle
    };
}();
