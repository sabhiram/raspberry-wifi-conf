var _       = require("underscore")._,
    async   = require("async"),
    exec    = require("child_process").exec,
    util    = require("util");

/*****************************************************************************\
    Return a set of functions which we can use to manage and check our wifi
    connection information
\*****************************************************************************/
module.exports = function() {

    // Hack: this just assumes that the outbound interface will be "wlan0"

    // Define some globals
    var ifconfig_fields = {
        "hw_addr":         /HWaddr\s([^\s]+)/,
        "inet_addr":       /inet addr:([^\s]+)/,
    },  iwconfig_fields = {
        "ap_addr":         /Access Point:\s([^\s]+)/,
        "ap_ssid":         /ESSID:\"([^\"]+)\"/,
    },  last_wifi_info = null;

    // TODO: rpi-config-ap hardcoded, should derive from a constant

    // Define a bunch of functions...
    var _get_wifi_info = function(callback) {
        var output = {
            hw_addr: "<unknown>",
            inet_addr: "<unknown>",
        };

        // Inner function which runs a given command and sets a bunch
        // of fields
        function run_command_and_set_fields(cmd, fields, callback) {
            exec(cmd, function(error, stdout, stderr) {
                if (error) return callback(error);
                for (var key in fields) {
                    re = stdout.match(fields[key]);
                    if (re && re.length > 1) {
                        output[key] = re[1];
                    }
                }
                callback(null);
            });
        }

        // Run a bunch of commands and aggregate info
        async.series([
            function run_ifconfig(next_step) {
                run_command_and_set_fields("ifconfig wlan0", ifconfig_fields, next_step);
            },
            function run_iwconfig(next_step) {
                run_command_and_set_fields("iwconfig wlan0", iwconfig_fields, next_step);
            },
        ], function(error) {
            last_wifi_info = output;
            return callback(error, output);
        });
    },

    _is_ap_enabled = function(callback) {
        // Being invoked async'ly - so get the data
        // and return the appropriate condition
        if (typeof(callback) == "function") {
            _get_wifi_info(function(error, result) {
                if (error) return callback(error, null);
                // If the hw_addr matches the ap_addr
                // and the ap_ssid matches "rpi-config-ap"
                // then we are in AP mode
                var is_ap =
                    result["hw_addr"].toLowerCase() == result["ap_addr"].toLowerCase() &&
                    result["ap_ssid"] == "rpi-config-ap",
                    output = (is_ap) ? result["hw_addr"].toLowerCase() : null;
                return callback(null, output);
            });
        }
        // Being invoked by value, we have already computed result
        else {
            var result = callback,
                is_ap  =
                    result["hw_addr"].toLowerCase() == result["ap_addr"].toLowerCase() &&
                    result["ap_ssid"] == "rpi-config-ap";
                return (is_ap) ? result["hw_addr"].toLowerCase() : null;
        }
    },

    _is_wifi_enabled = function(callback) {
        // Being invoked async'ly - so get the data
        // and return the appropriate condition
        if (typeof(callback) == "function") {
            _get_wifi_info(function(error, result) {
                if (error) return callback(error, null);
                // If we are not an AP, and we have a valid
                // inet_addr - wifi is enabled!
                var ap_enabled_addr = _is_ap_enabled(result);
                if (ap_enabled_addr == null && result["inet_addr"] != "<unknown>") {
                    return callback(null, result["inet_addr"]);
                }
                return callback(null, null);
            });
        }
        // Being invoked by value, we have already computed result
        else {
            var result = callback;

            if (!_is_ap_enabled(result) && result["inet_addr"] != "<unknown>") {
                return result["inet_addr"];
            }
            return null;
        }
    },

    _enable_ap_mode = function(bcast_ssid, callback) {
        console.log("_enable_ap_mode invoked...");

        _is_ap_enabled(function(error, result_addr) {
            if (result_addr && !error) {
                console.log("Access point is enabled with ADDR: " + result_addr);
            } else if (!error) {
                console.log("Access point is not enabled");
            }
            return callback(error);
        });
    };



    return {
        get_wifi_info:   _get_wifi_info,
        is_wifi_enabled: _is_wifi_enabled,
        enable_ap_mode:  _enable_ap_mode,
    };
}
