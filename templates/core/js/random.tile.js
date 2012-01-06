function RandomTile(container, params) {

    function realize() {

        $.tmpl("core.random", { "id": params.id }).appendTo(container);
    }

    return {
        "realize": realize
    };
}
