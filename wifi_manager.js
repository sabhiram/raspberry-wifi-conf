var _       = require("underscore")._,
    exec    = require("child_process").exec,
    util    = require("util");

/*****************************************************************************\
    Return a set of functions which we can use to manage and check our wifi
    connection information
\*****************************************************************************/
module.exports = function() {

    // Hack: this just assumes that the outbound interface will be "wlan0"

    // Define a bunch of functions...
    var
    _get_wifi_info = function(callback) {
        var output = {
            hw_addr: "<unknown>",
            inet_addr: "<unknown>",
        };

        exec("ifconfig wlan0", function(error, stdout, stderr) {
            if (error) {
                return callback(error, output)
            }

            var re_hw_addr = stdout.match(/HWaddr\s([^\s]+)/);
            if (re_hw_addr) {
                output["hw_addr"] = re_hw_addr[1];
            }

            var re_inet_addr = stdout.match(/inet addr:([^\s]+)/);
            if (re_inet_addr) {
                output["inet_addr"] = re_inet_addr[1];
            }

            callback(null, output);
        });
    },

    _is_wifi_enabled = function(callback) {
        _get_wifi_info(function(error, result) {
            callback(error, result["inet_addr"]);
        });
    },

    _enable_ap_mode = function(bcast_ssid, callback) {
        console.log("_enable_ap_mode invoked...");

        callback(null);
    };



    return {
        get_wifi_info:   _get_wifi_info,
        is_wifi_enabled: _is_wifi_enabled,
        enable_ap_mode:  _enable_ap_mode,
    };
}
