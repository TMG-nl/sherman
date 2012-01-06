function WelcomeTile(container) {

    function realize() {

        $.tmpl("core.welcome").appendTo(container);
    }

    return {
        "realize": realize
    };
}
