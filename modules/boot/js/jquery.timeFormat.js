(function($) {

    var RELATIVE_TIME_LIMIT = 1800; // secs (exclusive)

    var useUpdatingTimestamps = true;
    var updatingTimer = null;
    var updatingTimestamps = {}; // id => timestamp map

    function updateTimestamps() {

        var currentDate = new Date();
        for (var id in updatingTimestamps) {
            if (updatingTimestamps.hasOwnProperty(id)) {
                var timestamp = updatingTimestamps[id];
                var secsAgo = Math.round(currentDate.getTime() / 1000 - timestamp);
                if (secsAgo >= RELATIVE_TIME_LIMIT) {
                    delete updatingTimestamps[id];

                    if ($.isEmptyObject(updatingTimestamps)) {
                        clearInterval(updatingTimer);
                        updatingTimer = null;
                    }
                }

                var element = document.getElementById(id);
                if (element) {
                    var minsAgo = Math.round(secsAgo / 60);
                    element.textContent = getRelativeTimestamp(secsAgo, minsAgo, timestamp, currentDate);
                }
            }
        }
    }

    $.timeFormat = function(timestamp) {

        return handleDate(timestamp);
    };

    $.setUseUpdatingTimestamps = function(enable) {

        useUpdatingTimestamps = enable;
    };

    $.updatingTimeFormat = function(timestamp) {

        var currentDate = new Date();
        if (!useUpdatingTimestamps) {
            return getAbsoluteTimestamp(timestamp, currentDate);
        }

        var secsAgo = Math.round(currentDate.getTime() / 1000 - timestamp);
        var minsAgo = Math.round(secsAgo / 60);

        var text = getRelativeTimestamp(secsAgo, minsAgo, timestamp, currentDate);
        if (secsAgo < RELATIVE_TIME_LIMIT) {
            var id = "tf_" + Number.randomId(6);

            updatingTimestamps[id] = timestamp;
            if (updatingTimer === null) {
                updatingTimer = setInterval(updateTimestamps, 30000);
            }

            return "<span id=\"" + id + "\">" + text + "</span>";
        } else {
            return text;
        }
    };

    $.dateFormat = function(day, month, year) {

        if (day === undefined && month === undefined) {
            var currentDate = new Date();
            day = currentDate.getDate();
            month = currentDate.getMonth() + 1;
        }

        var dateString = "";

        if (Modules.currentLocale() == "nl_NL") {
            dateString = day + " " + fullMonths[month - 1];
        } else {
            dateString = fullMonths[month - 1] + " " + day + postfix[day - 1];
        }

        if (year) {
            if (Modules.currentLocale() == "nl_NL") {
                dateString += " " + year;
            } else {
                dateString += ", " + year;
            }
        }

        return dateString;
    };

    $.dateFormatTimestamp = function(timestamp) {

        var date = new Date(timestamp * 1000);
        return $.dateFormat(date.getDate(), date.getMonth() + 1, date.getFullYear());
    };

    $.dayOfWeek = function(day, capitalize) {

        if (day === undefined || day === null) {
            var currentDate = new Date();
            day = currentDate.getDay();
        }

        var dayString = fullDays[day];
        if (capitalize) {
            dayString = dayString.substr(0, 1).toUpperCase() + dayString.substr(1);
        }
        return dayString;
    };

    function handleDate(timestamp) {

        if (timestamp) {
            var currentDate = new Date();
            var secsAgo = Math.round(currentDate.getTime() / 1000 - timestamp);
            var minsAgo = Math.round(secsAgo / 60);
            return getRelativeTimestamp(secsAgo, minsAgo, timestamp, currentDate);
        }
        return "";
    }

    function getRelativeTimestamp(secsAgo, minsAgo, timestamp, currentDate) {

        if (secsAgo < 30) {
            return "[[JUST_NOW]]";
        } else if (secsAgo < 90) {
            return "1 [[MINUTE]] [[AGO]]";
        } else if (secsAgo < RELATIVE_TIME_LIMIT) {
            return minsAgo + " [[MINUTES]] [[AGO]]";
        } else {
            return getAbsoluteTimestamp(timestamp, currentDate);
        }
    }

    function getAbsoluteTimestamp(timestamp, currentDate) {

        var date = new Date(parseInt(timestamp) * 1000);

        var timeString = "";
        var dateString = "";

        var minutes = date.getMinutes();
        if (minutes < 10) {
            minutes = "0" + minutes;
        }
        if (Modules.currentLocale() == "nl_NL") {
            timeString = date.getHours() + ":" + minutes;
        } else {
            var hours = date.getHours() % 12;
            if (hours == 0) {
                hours = 12;
            }
            timeString = hours + ":" + minutes + " " + (date.getHours() / 12 >= 1.0 ? "PM" : "AM");
        }

        if (date.getDate() != currentDate.getDate() ||
            date.getMonth() != currentDate.getMonth() ||
            date.getFullYear() != currentDate.getFullYear()) {

            var yesterDate = new Date(currentDate.getTime() - (24 * 60 * 60 * 1000));

            if (date.getDate() == yesterDate.getDate() &&
                date.getMonth() == yesterDate.getMonth() &&
                date.getFullYear() == yesterDate.getFullYear()) {
                dateString = "[[YESTERDAY]]";
            } else {
                if (Modules.currentLocale() == "nl_NL") {
                    dateString = date.getDate() + " " + months[date.getMonth()];
                } else {
                    var day = date.getDate();
                    dateString = months[date.getMonth()] + " " + day + postfix[day - 1];
                }

                if (currentDate - timestamp > 365 * 24 * 60 * 60 * 1000) {
                    if (Modules.currentLocale() == "nl_NL") {
                        dateString += " " + date.getFullYear();
                    } else {
                        dateString += ", " + date.getFullYear();
                    }
                }
            }
        }

        if (dateString == "") {
            return timeString;
        } else {
            if (Modules.currentLocale() == "nl_NL") {
                return dateString + ", " + timeString;
            } else {
                return timeString + " " + dateString;
            }
        }
    }

    var months = [
    "[[MONTH_JAN]]",
    "[[MONTH_FEB]]",
    "[[MONTH_MAR]]",
    "[[MONTH_APR]]",
    "[[MONTH_MAY]]",
    "[[MONTH_JUN]]",
    "[[MONTH_JUL]]",
    "[[MONTH_AUG]]",
    "[[MONTH_SEP]]",
    "[[MONTH_OCT]]",
    "[[MONTH_NOV]]",
    "[[MONTH_DEC]]"
    ];

    var fullMonths = [
    "[[MONTH_JANUARY]]",
    "[[MONTH_FEBRUARY]]",
    "[[MONTH_MARCH]]",
    "[[MONTH_APRIL]]",
    "[[MONTH_MAY]]",
    "[[MONTH_JUNE]]",
    "[[MONTH_JULY]]",
    "[[MONTH_AUGUST]]",
    "[[MONTH_SEPTEMBER]]",
    "[[MONTH_OCTOBER]]",
    "[[MONTH_NOVEMBER]]",
    "[[MONTH_DECEMBER]]"
    ];

    var fullDays = [
    "[[DAY_SUNDAY]]",
    "[[DAY_MONDAY]]",
    "[[DAY_TUESDAY]]",
    "[[DAY_WEDNESDAY]]",
    "[[DAY_THURSDAY]]",
    "[[DAY_FRIDAY]]",
    "[[DAY_SHABBAS]]"
    ];

    var postfix = [
    "st", "nd", "rd", "th", "th", "th", "th", "th", "th", "th",
    "th", "th", "th", "th", "th", "th", "th", "th", "th", "th",
    "st", "nd", "rd", "th", "th", "th", "th", "th", "th", "th",
    "st"
    ];

    /**
     * From jquery-dateFormat plugin
     * https://github.com/phstc/jquery-dateFormat
     */
    $.format = (function () {
        var daysInWeek = fullDays;
        var shortMonthsInYear = months;
        var longMonthsInYear = fullMonths;
        var shortMonthsToNumber = [];
        shortMonthsToNumber["Jan"] = "01";
        shortMonthsToNumber["Feb"] = "02";
        shortMonthsToNumber["Mar"] = "03";
        shortMonthsToNumber["Apr"] = "04";
        shortMonthsToNumber["May"] = "05";
        shortMonthsToNumber["Jun"] = "06";
        shortMonthsToNumber["Jul"] = "07";
        shortMonthsToNumber["Aug"] = "08";
        shortMonthsToNumber["Sep"] = "09";
        shortMonthsToNumber["Oct"] = "10";
        shortMonthsToNumber["Nov"] = "11";
        shortMonthsToNumber["Dec"] = "12";

        function strDay(value) {
            return daysInWeek[parseInt(value, 10)] || value;
        }

        function strMonth(value) {
            var monthArrayIndex = parseInt(value, 10) - 1;
            return shortMonthsInYear[monthArrayIndex] || value;
        }

        function strLongMonth(value) {
            var monthArrayIndex = parseInt(value, 10) - 1;
            return longMonthsInYear[monthArrayIndex] || value;
        }

        var parseMonth = function (value) {
            return shortMonthsToNumber[value] || value;
        };

        var parseTime = function (value) {
            var retValue = value;
            var millis = "";
            if (retValue.indexOf(".") !== -1) {
                var delimited = retValue.split('.');
                retValue = delimited[0];
                millis = delimited[1];
            }

            var values3 = retValue.split(":");

            if (values3.length === 3) {
                hour = values3[0];
                minute = values3[1];
                second = values3[2];

                return {
                    time: retValue,
                    hour: hour,
                    minute: minute,
                    second: second,
                    millis: millis
                };
            } else {
                return {
                    time: "",
                    hour: "",
                    minute: "",
                    second: "",
                    millis: ""
                };
            }
        };

        return {
            date: function (value, format) {
                /*
                    value = new java.util.Date()
                    2009-12-18 10:54:50.546
		*/
                try {
                    var date = null;
                    var year = null;
                    var month = null;
                    var dayOfMonth = null;
                    var dayOfWeek = null;
                    var time = null;
                    /* HYVES */
                    if (!isNaN(parseInt(value))) { // timestamp
                        value = new Date(value * 1000);
                    }
                    /* /HYVES */

                    if (typeof value.getFullYear === "function") {
                        year = value.getFullYear();
                        month = value.getMonth() + 1;
                        dayOfMonth = value.getDate();
                        dayOfWeek = value.getDay();
                        time = parseTime(value.toTimeString());
                    } else if (value.search(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.?\d{0,3}[-+]?\d{2}:\d{2}/) != -1) { /* 2009-04-19T16:11:05+02:00 */
                        var values = value.split(/[T\+-]/);
                        year = values[0];
                        month = values[1];
                        dayOfMonth = values[2];
                        time = parseTime(values[3].split(".")[0]);
                        date = new Date(year, month - 1, dayOfMonth);
                        dayOfWeek = date.getDay();
                    } else {
                        var values = value.split(" ");
                        switch (values.length) {
                            case 6:
                                /* Wed Jan 13 10:43:41 CET 2010 */
                                year = values[5];
                                month = parseMonth(values[1]);
                                dayOfMonth = values[2];
                                time = parseTime(values[3]);
                                date = new Date(year, month - 1, dayOfMonth);
                                dayOfWeek = date.getDay();
                                break;
                            case 2:
                                /* 2009-12-18 10:54:50.546 */
                                var values2 = values[0].split("-");
                                year = values2[0];
                                month = values2[1];
                                dayOfMonth = values2[2];
                                time = parseTime(values[1]);
                                date = new Date(year, month - 1, dayOfMonth);
                                dayOfWeek = date.getDay();
                                break;
                            case 7:
                            /* Tue Mar 01 2011 12:01:42 GMT-0800 (PST) */
                            case 9:
                            /*added by Larry, for Fri Apr 08 2011 00:00:00 GMT+0800 (China Standard Time) */
                            case 10:
                                /* added by Larry, for Fri Apr 08 2011 00:00:00 GMT+0200 (W. Europe Daylight Time) */
                                year = values[3];
                                month = parseMonth(values[1]);
                                dayOfMonth = values[2];
                                time = parseTime(values[4]);
                                date = new Date(year, month - 1, dayOfMonth);
                                dayOfWeek = date.getDay();
                                break;
                            default:
                                return value;
                        }
                    }

                    var pattern = "";
                    var retValue = "";
                    /*
                        Issue 1 - variable scope issue in format.date
                        Thanks jakemonO
                    */
                    for (var i = 0; i < format.length; i++) {
                        var currentPattern = format.charAt(i);
                        pattern += currentPattern;
                        switch (pattern) {
                            case "ddd":
                                retValue += strDay(dayOfWeek);
                                pattern = "";
                                break;
                            case "dd":
                                if (format.charAt(i + 1) == "d") {
                                    break;
                                }
                                if (String(dayOfMonth).length === 1) {
                                    dayOfMonth = '0' + dayOfMonth;
                                }
                                retValue += dayOfMonth;
                                pattern = "";
                                break;
                            case "MMMM":
                                retValue += strLongMonth(month);
                                pattern = "";
                                break;
                            case "MMM":
                                if (format.charAt(i + 1) === "M") {
                                    break;
                                }
                                retValue += strMonth(month);
                                pattern = "";
                                break;
                            case "MM":
                                if (format.charAt(i + 1) == "M") {
                                    break;
                                }
                                if (String(month).length === 1) {
                                    month = '0' + month;
                                }
                                retValue += month;
                                pattern = "";
                                break;
                            case "yyyy":
                                retValue += year;
                                pattern = "";
                                break;
                            case "yy":
                                if (format.charAt(i + 1) == "y" &&
                                    format.charAt(i + 2) == "y") {
                                    break;
                                }
                                retValue += String(year).slice(-2);
                                pattern = "";
                                break;
                            case "HH":
                                retValue += time.hour;
                                pattern = "";
                                break;
                            case "hh":
                                /* time.hour is "00" as string == is used instead of === */
                                var hour = (time.hour == 0 ? 12 : time.hour < 13 ? time.hour : time.hour - 12);
                                hour = String(hour).length == 1 ? '0'+hour : hour;
                                retValue += hour;
                                pattern = "";
                                break;
                            case "mm":
                                retValue += time.minute;
                                pattern = "";
                                break;
                            case "ss":
                                /* ensure only seconds are added to the return string */
                                retValue += time.second.substring(0, 2);
                                pattern = "";
                                break;
                            case "SSS":
                                retValue += time.millis.substring(0, 3);
                                pattern = "";
                                break;
                            case "a":
                                retValue += time.hour >= 12 ? "PM" : "AM";
                                pattern = "";
                                break;
                            case " ":
                                retValue += currentPattern;
                                pattern = "";
                                break;
                            case "/":
                                retValue += currentPattern;
                                pattern = "";
                                break;
                            case ":":
                                retValue += currentPattern;
                                pattern = "";
                                break;
                            default:
                                if (pattern.length === 2 && pattern.indexOf("y") !== 0 && pattern != "SS") {
                                    retValue += pattern.substring(0, 1);
                                    pattern = pattern.substring(1, 2);
                                } else if ((pattern.length === 3 && pattern.indexOf("yyy") === -1)) {
                                    pattern = "";
                                }
                        }
                    }
                    return retValue;
                } catch (e) {
                    console.log(e);
                    return value;
                }
            }
        };
    }());
}(jQuery));
