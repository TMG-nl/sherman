/**
 * @class
 *
 * <h2>User-Agent recognizition and capability detection.</h2>
 *
 * <p>The UserAgent class represents the user-agent (be it a regular or a mobile
 * browser, Hyves Desktop, or anything else) and allows to query for the name,
 * version, and capabilities of the agent.
 *
 * <p>The name and version of the agent are determined by parsing the user-agent
 * string submitted to the server, and may not necessarily correspond to the
 * real agent used by the user (user-agent spoofing).
 *
 * <p>Note: This class should never export the user-agent string, or parts
 * thereof. If you need some checks on the user-agent string which are not yet
 * provided by this class, please implement them in this class, and add
 * appropriate tests in UserAgentTestCase. This is to prevent user-agent checks
 * spreading through-out our codebase.
 *
 * <p>There are methods for checking which browser is used, see is().<br>
 * Methods for checking the platform, see isPlatform().<br>
 * Methods for checking agent types, like isBot() and isMobileDevice().<br>
 * Methods for checking specific devices, like isIPhone().<br>
 * Methods for checking capabilities, see supports().<br>
 */
var UserAgent = function() {

    /**
     * Returns whether the reported user-agent matches the name given.
     *
     * <p>The name you give should be the name of a user-agent, like "MSIE",
     * "Firefox", "Safari", "Hyves Desktop", or any other agent. If you are
     * unsure about the name to use, there are also convenience methods for
     * the most common agents, like isIE(), isFirefox(), etc..
     *
     * @param name Name of the agent to check for.
     * @return true if the name matches the user-agent, false otherwise.
     *
     * @see isIE(), isFirefox(), isSafari(), isChrome(), isOpera(),
     *      isOperaMini()
     */
    function is(name) {

        return properties.browser == name;
    }

    /**
     * Convenience method for checking whether the user is using MSIE.
     *
     * @see is()
     */
    function isIE() {

        return is("MSIE");
    }

    /**
     * Convenience method for checking whether the user is using Firefox.
     *
     * @see is()
     */
    function isFirefox() {

        return is("Firefox");
    }

    /**
     * Convenience method for checking whether the user is using Safari.
     *
     * @see is()
     */
    function isSafari() {

        return is("Safari");
    }

    /**
     * Convenience method for checking whether the user is using Google Chrome.
     *
     * @see is()
     */
    function isChrome() {

        return is("Chrome");
    }

    /**
     * Convenience method for checking whether the user is using Opera.
     *
     * <p>Note that this also includes Opera Mini.
     *
     * @see is(), isOperaMini()
     */
    function isOpera() {

        return is("Opera") || is("Opera Mini");
    }

    /**
     * Convenience method for checking whether the user is using Opera Mini.
     *
     * @see is(), isOpera()
     */
    function isOperaMini() {

        return is("Opera Mini");
    }

    /**
     * Checks whether the version of the user-agent matches the version given.
     *
     * @param version User-agent version, like "1", or "3.0.9".
     * @return true if the version matches, false otherwise.
     *
     * <p>Please note that this method will test up to the granularity that you
     * specify in the version argument. For example, if the user is using
     * Firefox 3.5, isVersion("3") will return true, but isVersion("3.0") will
     * return false.
     *
     * <p>The highest granularity of versions is 3 levels deep, as in
     * "major.minor.patch".
     *
     * @see versionIsAtLeast(), versionIsLessThan()
     */
    function isVersion(version) {

        return compareVersions(version, properties.browserVersion, false, true, false);
    }

    /**
     * Checks whether the version of the user-agent is the same as or higher
     * than the version given.
     *
     * @param version User-agent version, like "1", or "3.0.9".
     * @return true if the version is at least the version given, false
     *         otherwise.
     *
     * @see isVersion(), versionIsLessThan()
     */
    function versionIsAtLeast(version) {

        return compareVersions(version, properties.browserVersion, true, true, false);
    }

    /**
     * Checks whether the version of the user-agent is older than the version
     * given.
     *
     * @param version User-agent version, like "1", or "3.0.9".
     * @return true if the version is less than the version given, false
     *         otherwise.
     *
     * @see isVersion(), versionIsAtLeast()
     */
    function versionIsLessThan(version) {

        return compareVersions(version, properties.browserVersion, false, false, true);
    }

    /**
     * Returns whether the reported user-agent is on the platform given.
     *
     * <p>The platform you give should be the name of a platform, like
     * "Windows", "Linux", "Mac OS", "Symbian", "Android", or any other
     * platform. If you are unsure about the platform to use, there are also
     * convenience methods for the most common platforms, like isWindows(),
     * isLinux(), etc..
     *
     * @param platform Name of the platform to check for.
     * @return true if the name matches the platform, false otherwise.
     *
     * @see isWindows(), isLinux(), isMac(), isSymbian(), isAndroid()
     */
    function isPlatform(platform) {

        return properties.platform == platform;
    }

    /**
     * Convenience method for checking whether the user is using Windows.
     *
     * @see isPlatform()
     */
    function isWindows() {

        return isPlatform("Windows");
    }

    /**
     * Convenience method for checking whether the user is using Linux.
     *
     * @see isPlatform()
     */
    function isLinux() {

        return isPlatform("Linux");
    }

    /**
     * Convenience method for checking whether the user is using Mac OS.
     *
     * @see isPlatform()
     */
    function isMac() {

        return isPlatform("Mac OS");
    }

    /**
     * Convenience method for checking whether the user is using Symbian, which
     * includes the derived platforms like S60.
     *
     * @see isPlatform(), isS60()
     */
    function isSymbian() {

        return isPlatform("Symbian") || isPlatform("S60");
    }

    /**
     * Convenience method for checking whether the user is using Symbian S60.
     *
     * @see isPlatform()
     */
    function isS60() {

        return isPlatform("S60");
    }

    /**
     * Convenience method for checking whether the user is using Maemo.
     *
     * @see isPlatform()
     *
     * <p>Note: Actually, all mobile Linux devices will be recognized as Maemo.
     */
    function isMaemo() {

        return isPlatform("Linux") && isMobileDevice();
    }

    /**
     * Convenience method for checking whether the user is using Android.
     *
     * @see isPlatform()
     */
    function isAndroid() {

        return isPlatform("Android");
    }

    /**
     * Convenience method for checking it's an Android tablet.
     *
     * <p>See: http://android-developers.blogspot.com/2010/12/android-browser-user-agent-issues.html
     *
     * @see isPlatform(), isMobileDevice()
     */
    function isAndroidTablet() {

        return isAndroid() && !isMobileDevice();
    }

    /**
     * Checks whether this is the PhoneGap container for Android devices.
     *
     * @return true if the user-agent is the PhoneGap container for Android
     *         devices, false otherwise.
     */
    function isAndroidContainer() {

        return isHybridContainer() && isAndroid();
    }

    /**
     * Checks whether the reported user-agent is branded by Hyves, i.e. the
     * Hyves version of IE8, Hyves Desktop, etc..
     *
     * @return true if the user-agent is Hyves branded, false otherwise.
     */
    function isHyvesBranded() {

        return supports("hyvesBrand");
    }

    /**
     * Checks whether this is the PhoneGap container for Nokia phones.
     *
     * @return true if the user-agent is the PhoneGap container for Nokia
     *         phones, false otherwise.
     */
    function isNokiaContainer() {

        return (isSymbian() || isMaemo()) && isHyvesBranded();
    }

    /**
     * Checks whether this is a Nokia platform
     *
     * @return true if the useragent is a Nokia platform
     */
    function isNokia() {

        return isSymbian() || isMaemo();
    }

    /**
     * Checks whether this is a PhoneGap container.
     *
     * @return true if the user-agent is a PhoneGap container, false otherwise.
     */
    function isHybridContainer() {

        return Boolean(
            (typeof window.device !== "undefined") || // window.device is set from the PhoneGap container
            (typeof window.phonegap !== "undefined") ||
            properties.container ||
            isNokiaContainer()
        );
    }

    /**
     * Checks whether the reported user-agent is a desktop browser.
     *
     * @return true if the user-agent is a desktop browser, false otherwise.
     */
    function isDesktopBrowser() {

        return properties.type == "desktop";
    }

    /**
     * Checks whether the reported user-agent is a mobile device, like a mobile
     * phone, an iPod Touch, etc..
     *
     * <p>Note that tablets are <strong>not</strong> considered to be mobile
     * devices by this method. Use isTablet() instead if you want to check
     * whether the user-agent is a tablet device.
     *
     * @return true if the user-agent belongs to a mobile device, false
     *         otherwise.
     */
    function isMobileDevice() {

        return properties.type == "mobile" || properties.type == "mobile-bot";
    }

    /**
     * Convenience method for checking whether the reported user-agent is a
     * tablet device.
     *
     * @return true if the user-agent belongs to a tablet device, false
     *         otherwise.
     *
     * @see isIPad(), isAndroidTablet()
     */
    function isTablet() {

        return isIPad() || isAndroidTablet();
    }

    /**
     * Checks whether the reported user-agent is on a mobile version of Mac OS.
     * This includes iPod Touch, iPhone and iPad devices.
     *
     * @return true if the user-agent belongs to a mobile Mac OS device, false
     *         otherwise.
     *
     * @see isIPhone(), isIPad()
     */
    function isIOS() {

        return isPlatform("iOS");
    }

    /**
     * Returns whether the reported user-agent indicates it is on the device
     * given.
     *
     * <p>The device you give should be the name of a device, like "iPhone",
     * "BlackBerry", "PSP", etc.. If you are unsure about the name to use,
     * there are also convenience methods for the most common agents, like
     * isIPhone(), isBlackBerry(), etc..
     *
     * @param device Name of the device to check for.
     * @return true if the device matches, false otherwise.
     *
     * @see isIPhone(), isBlackBerry()
     */
    function isDevice(device) {

        return properties.device == device || getQueryParam("device") === device;
    }

    /**
     * Checks whether the reported user-agent is an iPhone.
     *
     * <p>For most purposes you probably want to use isIOS() instead to not
     * exclude iPod Touch users.
     *
     * @return true if the user-agent belongs to an iPhone, false otherwise.
     *
     * @see isIOS()
     */
    function isIPhone() {

        return isDevice("iPhone");
    }

    /**
     * Checks whether the reported user-agent is an iPad.
     *
     * @return true if the user-agent belongs to an iPad, false otherwise.
     *
     * @see isIOS()
     */
    function isIPad() {

        return isDevice("iPad");
    }

    /**
     * Checks whether this is the PhoneGap container for the iPad.
     *
     * @return true if the user-agent is the PhoneGap container for iPad
     */
    function isIPadContainer() {

        return isHybridContainer() && isIPad();
    }

    /**
     * Checks whether this is the PhoneGap container for the iPhone.
     *
     * @return true if the user-agent is the PhoneGap container for iPhone
     */
    function isIPhoneContainer() {

        return isHybridContainer() && isIPhone();
    }

    /**
     * Checks whether this is the PhoneGap container for iOS.
     *
     * @return true if the user-agent is the PhoneGap container for iOS
     */
    function isIOSContainer() {

        return isHybridContainer() && isIOS();
    }


    /**
     * Checks whether the reported user-agent is on a BlackBerry device.
     *
     * @return true if the user-agent belongs to a BlackBerry, false otherwise.
     */
    function isBlackBerry() {

        return isDevice("BlackBerry");
    }

    /**
     * Checks whether this is the PhoneGap container for BlackBerry phones.
     *
     * @return true if the user-agent is the PhoneGap container for BlackBerry
     *         phones, false otherwise.
     */
    function isBlackBerryContainer() {

        return isHybridContainer() && isBlackBerry();
    }

    /**
     * Checks whether the reported user-agent is an installed Google Chrome
     * Extension.
     *
     * @return true if the user-agent is an installed Google Chrome Extension
     */
    function isChromeExtension() {

        return window.chrome && window.chrome.extension;
    }

    /**
     * Checks whether the version of the user-agent matches the version given.
     *
     * @param version User-agent version, like "1", or "3.0.9".
     * @return true if the version matches, false otherwise.
     *
     * <p>Please note that this method will test up to the granularity that you
     * specify in the version argument. For example, if the user is using
     * Firefox 3.5, isVersion("3") will return true, but isVersion("3.0") will
     * return false.
     *
     * <p>The highest granularity of versions is 3 levels deep, as in
     * "major.minor.patch".
     *
     * @see versionIsAtLeast(), versionIsLessThan()
     */
    function isPlatformVersion(version) {

        return compareVersions(version, properties.platformVersion, false, true, false);
    }

    /**
     * Checks whether the version of the user-agent is the same as or higher
     * than the version given.
     *
     * @param version User-agent version, like "1", or "3.0.9".
     * @return true if the version is at least the version given, false
     *         otherwise.
     *
     * @see isVersion(), versionIsLessThan()
     */
    function platformVersionIsAtLeast(version) {

        return compareVersions(version, properties.platformVersion, true, true, false);
    }

    /**
     * Checks whether the version of the platform is older than the version
     * given.
     *
     * @param version User-agent version, like "1", or "3.0.9".
     * @return true if the version is less than the version given, false
     *         otherwise.
     *
     * @see isVersion(), versionIsAtLeast()
     */
    function platformVersionIsLessThan(version) {

        return compareVersions(version, properties.platformVersion, false, false, true);
    }

    /**
     * Returns whether the reported user-agent supports the given capability.
     *
     * @param capability The capability to check for.
     *
     * <p>Currently supported capabilities are:</p>
     * <ul>
     *     <li><strong>cssPositionFixed</strong></li>
     *     <li><strong>cssShadows</strong></li>
     *     <li><strong>hyvesBrand</strong></li>
     *     <li><strong>touchEvents</strong></li>
     *     <li><strong>touchScreen</strong></li>
     *     <li><strong>scrollability</strong> (ie. the scrollability
     *                                         library)</li>
     *     <li><strong>iscroll</strong> (ie. the iscroll library)</li>
     *     <li><strong>html5History</strong></li>
     *     <li><strong>keyup</strong> Whether the agent properly reports keyup
     *                                events.</li>
     *     <li><strong>placeholder</strong> Showing placeholders in input
     *                                      fields.</li>
     * </ul>
     */
    function supports(capability) {

        if (properties.capabilities.hasOwnProperty(capability)) {
            return properties.capabilities[capability];
        } else {
            return false;
        }
    }

    /**
     * Explicitly sets the value for a specific capability to true or false.
     *
     * @param capability The capability to check.
     * @param value Boolean value indicating whether the capability is
     *              supported.
     */
    function setCapability(capability, value) {

        properties.capabilities[capability] = !!value;
    }

    /**
     * Returns whether the reported user-agent is a bot, like a web crawler.
     */
    function isBot() {

        return properties.type == "bot" || properties.type == "mobile-bot";
    }

    var properties = {
        "browser": "Unknown",
        "browserVersion": [0, 0, 0],
        "type": "mobile",
        "device": "Mobile",
        "platform": "Unknown",
        "platformVersion": [0, 0, 0],
        "capabilities": {
            "cssPositionFixed": false,
            "cssShadows": false,
            "hyvesBrand": false,
            "touchEvents": false,
            "touchScreen": false,
            "keyup": true,
            "placeholder": true
        }
    };

    // When updating this array, you should also update useragentcapabilities.php in mainweb.
    var userAgentCapabilities = {
        // bots
        "clusty": { "type": "bot" },
        "googlebot-mobile": { "type": "mobile-bot" }, // GoogleBot-Mobile
        "googlebot": { "type": "bot" }, // GoogleBot
        "mediapartners-google": { "type": "bot" }, // google adsense
        "yahoo-verticalcrawler": { "type": "bot" }, // old yahoo bot
        "yahoo! slurp": { "type": "bot" }, // new yahoo bot
        "yahoo-mm": { "type": "bot" }, // gets Yahoo-MMCrawler and Yahoo-MMAudVid bots
        "inktomi": { "type": "bot" }, // inktomi bot
        "slurp": { "type": "bot" }, // inktomi bot
        "fast-webcrawler": { "type": "bot" }, // Fast AllTheWeb
        "msnbot": { "type": "bot" }, // msn search
        "ask jeeves": { "type": "bot" }, //jeeves/teoma
        "teoma": { "type": "bot" }, //jeeves teoma
        "scooter": { "type": "bot" }, // altavista
        "openbot": { "type": "bot" }, // openbot, from taiwan
        "ia_archiver": { "type": "bot" }, // ia archiver
        "zyborg": { "type": "bot" }, // looksmart
        "almaden": { "type": "bot" }, // ibm almaden web crawler
        "baiduspider": { "type": "bot" }, // Baiduspider asian search spider
        "psbot": { "type": "bot" }, // psbot image crawler
        "gigabot": { "type": "bot" }, // gigabot crawler
        "naverbot": { "type": "bot" }, // naverbot crawler, bad bot, block
        "surveybot": { "type": "bot" }, //
        "boitho.com-dc": { "type": "bot" }, //norwegian search engine
        "objectssearch": { "type": "bot" }, // open source search engine
        "answerbus": { "type": "bot" }, // http://www.answerbus.com/, web questions
        "sohu-search": { "type": "bot" }, // chinese media company, search component
        "iltrovatore-setaccio": { "type": "bot" },

        // mobile devices and browsers
        "browserng": { "type": "mobile", "browser": "BrowserNG", "browserVersionKey": "browserng/" },
        "netfront": { "type": "mobile", "browser": "NetFront", "browserVersionKey": "netfront/" },
        "windows ce": { "type": "mobile" },
        "palmos": { "type": "mobile", "platform": "PalmOS" },
        "palmsource": { "type": "mobile", "platform": "PalmSource" },
        "series60": { "type": "mobile", "platform": "S60", "platformVersionKey": "series60/" },
        "symbian": { "type": "mobile", "platform": "Symbian", "capabilities": { "cssShadows": false, "cssPositionFixed": true, "keyup": false } },
        // android is by default not type:mobile since there are also tablets
        "i9100": { "capabilities": { "cssPositionFixed": false } },
        "android": { "platform": "Android", "platformVersionKey": "android ", "capabilities": { "touchScreen": true, "cssPositionFixed": false, "cssShadows": false }, "platformVersionCapabilities": { ">=3.0": { "cssPositionFixed": true, "cssShadows": true } }},
        "midp": { "type": "mobile" },
        "up.browser": { "type": "mobile" },
        "siemens": { "type": "mobile" },
        "blackberry93": { "capabilities": { "placeholder": false } },
        "blackberry 93": { "capabilities": { "placeholder": false } },
        "blackberry95": { "capabilities": { "touchScreen": true } },
        "blackberry 95": { "capabilities": { "touchScreen": true } },
        "blackberry9790": { "capabilities": { "cssPositionFixed": true, "touchScreen": true } },
        "blackberry 9790": { "capabilities": { "cssPositionFixed": true, "touchScreen": true } },
        "blackberry": { "type": "mobile", "device": "BlackBerry", "capabilities": { "cssPositionFixed": false } },
        "samsung": { "type": "mobile", "device": "Samsung" },
        "sec-": { "type": "mobile", "device": "Samsung" }, // Samsung electroncics
        "alcatel": { "type": "mobile" },
        "motorola": { "type": "mobile", "device": "Motorola" },
        "mot-": { "type": "mobile", "device": "Motorola" },
        "sagem": { "type": "mobile" },
        "telit": { "type": "mobile" },
        "lg": { "type": "mobile" },
        "philips": { "type": "mobile" },
        "hutchison": { "type": "mobile" },
        "panasonic": { "type": "mobile" },
        "sanyo": { "type": "mobile" },
        "qc": { "type": "mobile" },
        "configuration/cldc": { "type": "mobile" },
        "ericsson": { "type": "mobile", "device": "SonyEricsson" },
        "sharp": { "type": "mobile" },
        "hitachi": { "type": "mobile" },
        "compel": { "type": "mobile" },
        "docomo": { "type": "mobile" },
        "portalmmm": { "type": "mobile" },
        "opwv-sdk": { "type": "mobile" },
        "ipad": { "type": "desktop", "platform": "iOS", "device": "iPad", "platformVersionKey": "ipad; cpu os ", "capabilities": { "touchScreen": true, "cssPositionFixed": false }, "platformVersionCapabilities": { ">=5": { "scrollover": true, "cssPositionFixed": true, "cssShadows": true } } },
        "iphone": { "type": "mobile", "platform": "iOS", "device": "iPhone", "platformVersionKey": "iphone os ", "capabilities": { "touchScreen": true, "cssPositionFixed": false, "groupchat": true, "cssShadows": false }, "platformVersionCapabilities": { ">=5": { "scrollover": true, "cssPositionFixed": true, "cssShadows": true } } },
        "ipod": { "type": "mobile", "platform": "iOS", "device": "iPod", "capabilities": { "touchScreen": true, "cssPositionFixed": false, "groupchat": true, "cssShadows": false }, "platformVersionCapabilities": { ">=5": { "scrollover": true, "cssShadows": true } } }, // the iPod Touch has a webbrowser
        "playstation portable": { "type": "mobile", "device": "PSP" },
        "opera mobi": { "type": "mobile", "browser": "Opera" },
        "opera mini": { "type": "mobile", "browser": "Opera Mini", "browserVersionKey": "opera mini/", "capabilities": { "cssPositionFixed": false } },
        "htc_touch": { "type": "mobile" },
        "htc_diamond": { "type": "mobile" },
        "htc": { "type": "mobile", "device": "HTC" },
        "nokia": { "type": "mobile", "device": "Nokia", "platform": "Symbian", "capabilities": { "keyup": false } },
        "nokia3250": { "capabilities": { "touchScreen": true, "keyup": false } },
        "nokiac6-": { "capabilities": { "touchScreen": true, "keyup": false } },
        "nokiac7-": { "capabilities": { "touchScreen": true, "keyup": false } },
        "nokian8-": { "capabilities": { "touchScreen": true, "keyup": false } },
        "nokian97-": { "capabilities": { "touchScreen": true, "keyup": false } },
        "n900": { "type": "mobile", "device": "Nokia", "platform": "Linux", "browser": "Firefox", "capabilities": { "touchScreen": true, "cssPositionFixed": false, "keyup": false } },
        "maemo": { "type": "mobile", "device": "Nokia", "platform": "Linux", "browser": "Firefox" },
        "mobile": { "type": "mobile", "capabilities": { "touchScreen": true } }, // assume all mobile devices (we support) have a touch interface
        "mobileie": { "type": "mobile", "platform": "Windows", "capabilities": { "keyup": true, "touchScreen": true, "cssPositionFixed": true } },

        // hyves-specific stuff
        "hyves": { "capabilities": { "hyvesBrand": true } },
        "hyvescontainer": { "container": true },
        "hybridcontainer": { "container": true },

        // desktop browsers
        "mozilla": { "type": "desktop" },
        "opera": { "type": "desktop", "browser": "Opera", "browserVersionKey": "opera/", "capabilities": { "cssPositionFixed": true } },
        "firefox": { "type": "desktop", "browser": "Firefox", "browserVersionKey": "firefox/", "capabilities": { "cssShadows": true, "cssPositionFixed": true } },
        "chromeframe": { "type": "desktop", "browser": "Chrome", "browserVersion": "", "browserVersionKey": "chromeframe/" }, // treat IE with Chromeframe as Chrome
        "chrome": { "type": "desktop", "browser": "Chrome", "browserVersion": "", "browserVersionKey": "chrome/", "capabilities": {"groupchat": true} },
        "trident/4.0": { "browserVersion": "8.0" },
        "trident/5.0": { "browserVersion": "9.0" },
        "msie": { "type": "desktop", "browser": "MSIE", "browserVersionKey": "msie ", "versionCapabilities": { ">=7": { "cssPositionFixed": true } }},
        "safari/85": { "browserVersion": "1.0" },
        "safari/125": { "browserVersion": "1.2" },
        "safari/312": { "browserVersion": "1.3" },
        "safari/41": { "browserVersion": "2.0" },
        "safari": { "browser": "Safari", "browserVersionKey": "version/", "capabilities": { "cssShadows": true, "cssPositionFixed": true } },

        // desktop platforms
        "beos": { "type": "desktop", "platform": "BeOS" },
        "os2": { "type": "desktop", "platform": "OS/2" },
        "x11": { "type": "desktop", "platform": "Linux" },
        "linux": { "type": "desktop", "platform": "Linux" },
        "mac": { "type": "desktop", "platform": "Mac OS" },
        "nt ": { "type": "desktop", "platform": "Windows", "platformVersionKey": "nt " },
        "windows": { "type": "desktop", "platform": "Windows" },
        "bsd": { "type": "desktop", "platform": "Unix" },
        "sun": { "type": "desktop", "platform": "Unix" }
    };

    function init() {

        var profilingToken = Profiling.start("UserAgent.init");

        var _properties = {
            "capabilities": { }
        };

        var userAgentString = navigator.userAgent.toLowerCase();
        for (var key in userAgentCapabilities) {
            if (userAgentCapabilities.hasOwnProperty(key) && userAgentString.indexOf(key) > -1) {
                var agentProperties = userAgentCapabilities[key];
                for (var propertyName in agentProperties) {
                    if (agentProperties.hasOwnProperty(propertyName)) {
                        var propertyValue = agentProperties[propertyName];

                        if (propertyName === "capabilities") {
                            for (var capabilityName in propertyValue) {
                                if (propertyValue.hasOwnProperty(capabilityName)) {
                                    if (!_properties[propertyName].hasOwnProperty(capabilityName)) {
                                        var capabilityValue = propertyValue[capabilityName];
                                        _properties[propertyName][capabilityName] = capabilityValue;
                                        //logging.debug("  setting capability [" + capabilityName + "] to [" + capabilityValue + "]");
                                    }
                                }
                            }
                        } else {
                            if (!_properties.hasOwnProperty(propertyName)) {
                                _properties[propertyName] = propertyValue;
                                //logging.debug("  setting property [" + propertyName + "] to [" + propertyValue + "]");
                            }
                        }
                    }
                }
            }
        }

        processProperties(_properties, userAgentString);

        // merge the properties we found into the real properties object
        for (var _propertyName in _properties) {
            if (_properties.hasOwnProperty(_propertyName)) {
                var _propertyValue = _properties[_propertyName];

                if (_propertyName == "capabilities") {
                    for (var _capabilityName in _propertyValue) {
                        if (_propertyValue.hasOwnProperty(_capabilityName)) {
                            var _capabilityValue = _propertyValue[_capabilityName];
                            properties[_propertyName][_capabilityName] = _capabilityValue;
                        }
                    }
                } else {
                    properties[_propertyName] = _propertyValue;
                }
            }
        }

        initCustomCapabilities();

        Profiling.stop("UserAgent.init", profilingToken);
    }

    function initCustomCapabilities() {

        properties.capabilities.touchEvents = hasTouchEventSupport();
        properties.capabilities.iscroll = (isIPhone() && !supports("scrollover"));
        properties.capabilities.scrollability = (isIPad() && !supports("scrollover"));
        properties.capabilities.pushnotifications = (navigator.push || isAndroidContainer() || window.device);
        properties.capabilities.chat = (isIPhoneContainer() || isIPadContainer() || getQueryParam("chat") === "1");
        properties.capabilities["chat-push"] = (isIPhoneContainer() || isIPadContainer());
    }

    function processProperties(properties, userAgentString) {

        processVersion(properties, userAgentString, "browserVersion");
        processVersion(properties, userAgentString, "platformVersion");

        processVersionCapabilities(properties, "versionCapabilities", "browserVersion");
        processVersionCapabilities(properties, "platformVersionCapabilities", "platformVersion");
    }

    function processVersion(properties, userAgentString, key) {

        if (properties.hasOwnProperty(key + "Key")) {
            if (!properties.hasOwnProperty(key) || properties[key] === "") {
                properties[key] = getVersion(properties[key + "Key"], userAgentString);
            }
            delete properties[key + "Key"];
        }

        if (properties.hasOwnProperty(key)) {
            properties[key] = parseVersion(properties[key]);
        }
    }

    function processVersionCapabilities(properties, versionCapabilitiesKey, versionKey) {

        if (!properties.hasOwnProperty(versionCapabilitiesKey)) {
            return;
        }

        for (var version in properties[versionCapabilitiesKey]) {
            if (properties[versionCapabilitiesKey].hasOwnProperty(version)) {
                var match = false;
                if (version.substr(0, 1) === "=") {
                    match = compareVersions(version.substr(1), properties[versionKey], false, true, false);
                } else if (version.substr(0, 2) === ">=") {
                    match = compareVersions(version.substr(2), properties[versionKey], true, true, false);
                } else if (version.substr(0, 1) === "<") {
                    match = compareVersions(version.substr(1), properties[versionKey], false, false, true);
                }
                if (!match) {
                    continue;
                }

                var capabilities = properties[versionCapabilitiesKey][version];
                for (var capabilityName in capabilities) {
                    if (capabilities.hasOwnProperty(capabilityName)) {
                        var capabilityValue = capabilities[capabilityName];
                        properties.capabilities[capabilityName] = capabilityValue;
                        //logging.debug("  setting capability [" + capabilityName + "] to [" + capabilityValue + "]");
                    }
                }
            }
        }

        delete properties[versionCapabilitiesKey];
    }

    function getVersion(key, userAgentString) {

        var startPos = userAgentString.indexOf(key);
        if (startPos === -1) {
            return "";
        }
        startPos += key.length;

        var endPos = userAgentString.indexOf(" );", startPos);
        return userAgentString.substring(startPos, endPos > 0 ? endPos : undefined);
    }

    function parseVersion(version) {

        version = (version).replace(/_/g,"."); // 4_3_3 => 4.3.3
        var normalizedVersion = "";
        var numericChars = "0123456789";
        var invalidChars = 0;
        for (var i = 0; i < version.length && invalidChars < 3; i++) {
            var character = version.charAt(i);
            if (numericChars.indexOf(character) > -1 || character === ".") {
                normalizedVersion += character;
                // fix 3.07 to become 3.0.7
                if (character === "0" && i > 0 && version.charAt(i - 1) === "." &&
                    i < version.length - 1 && numericChars.indexOf(version.charAt(i + 1))) {
                    normalizedVersion += ".";
                }
            } else {
                invalidChars++;
            }
        }

        var components = normalizedVersion.split(".", 3);
        for (var j = 0; j < components.length; j++) {
            components[j] = parseInt(components[j], 10);
            if (isNaN(components[j])) {
                components[j] = 0;
            }
        }
        for (j; j < 3; j++) {
            components[j] = 0;
        }
        return components;
    }

    function compareVersions(version1, version2Components, lessValue, equalValue, moreValue) {

        var components = version1.toString().split(".");
        for (var i = 0; i < 3; i++) {
            if (components.length < i + 1) {
                return equalValue;
            }
            var intVal = parseInt(components[i], 10);
            if (intVal > version2Components[i]) {
                return moreValue;
            } else if (intVal < version2Components[i]) {
                return lessValue;
            }
        }
        return equalValue;
    }

    function hasTouchEventSupport() {

        if (isNokiaContainer() || isBlackBerry()) {
            return false;
        }
        return "ontouchstart" in document.documentElement;
    }

    init();

    return {
        "is": is,
        "isIE": isIE,
        "isFirefox": isFirefox,
        "isSafari": isSafari,
        "isChrome": isChrome,
        "isChromeExtension": isChromeExtension,
        "isOpera": isOpera,
        "isOperaMini": isOperaMini,
        "isVersion": isVersion,
        "versionIsAtLeast": versionIsAtLeast,
        "versionIsLessThan": versionIsLessThan,
        "isPlatform": isPlatform,
        "isWindows": isWindows,
        "isLinux": isLinux,
        "isMac": isMac,
        "isSymbian": isSymbian,
        "isS60": isS60,
        "isMaemo": isMaemo,
        "isAndroid": isAndroid,
        "isTablet": isTablet,
        "isNokiaContainer": isNokiaContainer,
        "isHybridContainer": isHybridContainer,
        "isAndroidContainer": isAndroidContainer,
        "isBlackBerryContainer": isBlackBerryContainer,
        "isIPadContainer": isIPadContainer,
        "isIPhoneContainer": isIPhoneContainer,
        "isIOSContainer": isIOSContainer,
        "isDesktopBrowser": isDesktopBrowser,
        "isMobileDevice": isMobileDevice,
        "isIOS": isIOS,
        "isDevice": isDevice,
        "isIPhone": isIPhone,
        "isIPad": isIPad,
        "isBlackBerry": isBlackBerry,
        "isNokia": isNokia,
        "isPlatformVersion": isPlatformVersion,
        "platformVersionIsAtLeast": platformVersionIsAtLeast,
        "platformVersionIsLessThan": platformVersionIsLessThan,
        "supports": supports,
        "setCapability": setCapability,
        "isBot": isBot
    };
}();
