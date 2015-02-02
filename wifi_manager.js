var _       = require("underscore")._,
    exec    = require("child_process").exec,
    util    = require("util");

/*****************************************************************************\
    Return a set of functions which we can use to manage and check our wifi
    connection information
\*****************************************************************************/
module.exports = function() {

    // Hack: this just assumes that the outbound interface will be
    // wlan0.

    var _get_wifi_info = function(callback) {
        callback(null, "Hello");
    };

    return {
        get_wifi_info:  _get_wifi_info,
    };
}
