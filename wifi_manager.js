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
    };

    // TODO: ottoQ-config-ap hardcoded, should derive from a constant

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
            return callback(error, output);
        });
    },

    _is_wifi_enabled = function(callback) {
        _get_wifi_info(function(error, result) {
            callback(error, result["inet_addr"]);
        });
    },

    _enable_ap_mode = function(bcast_ssid, callback) {
        console.log("_enable_ap_mode invoked...");

        _is_ap_enabled(function(error, result_addr) {
            if (result_addr && !error) {
                console.log("Access point is enabled with ADDR: " + result_addr);
            } else if (!error) {
                console.log("Access point is not enabled");
            }

            callback(error);
        });

        callback(null);
    };



    return {
        get_wifi_info:   _get_wifi_info,
        is_wifi_enabled: _is_wifi_enabled,
        enable_ap_mode:  _enable_ap_mode,
    };
}
