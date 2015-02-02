var _                   = require("underscore")._,
    async               = require("async"),

    util                = require("util"),
    fs                  = require("fs"),
    path                = require("path"),

    iwlist              = require("./iwlist"),
    wifi_manager        = require("./wifi_manager")();

/*****************************************************************************\
    1. Check to see if we are connected to a wifi AP
    2. If connected to a wifi, do nothing -> exit
    3. Convert RPI to act as a AP (with a configurable SSID)
    4. Host a lightweight HTTP server which allows for the user to connect and
       configure the RPIs wifi connection. The interfaces exposed are RESTy so
       other applications can similarly implement their own UIs around the
       data returned.
    5. Once the RPI is successfully configured, reset it to act as a wifi
       device (not AP anymore), and setup its wifi network based on what the
       user picked.
    6. At this stage, the RPI is named, and has a valid wifi connection which
       its bound to, reboot the pi and re-run this script on startup.
\*****************************************************************************/

async.series([
    // 1. Check if wifi is enabled / connected
    function test_is_wifi_enabled(next_step) {
        wifi_manager.is_wifi_enabled(function(error, result_ip) {
            if (result_ip != "<unknown>") {
                console.log("Wifi is enabled, and IP " + result_ip + " assigned");
                process.exit(0);
            } else {
                console.log("Wifi is not enabled!");
            }
            next_step(error);
        });
    },

    // 2. Turn RPI into an access point
    function enable_rpi_ap(next_step) {
        wifi_manager.enable_ap_mode("ottoQ-router", next_step);
    },

    // 3. Host HTTP server while functioning as AP

    // 4+ - Config steps will be done as a result of REST calls made later

], function(error) {
    console.log("Done!!");
});






/*

async.series([
    function check_wifi_connection(next_step) {
        iwlist(function(error, result) {
            console.log(util.inspect(result, { depth: null }));
            next_step(error);
        });
    },

    function test_get_wifi_info(next_step) {
        wifi_manager.get_wifi_info(function(error, result) {
           console.log(util.inspect(result, { depth: null }));
           next_step(error);
        });
    },

    function test_is_wifi_enabled(next_step) {
        wifi_manager.is_wifi_enabled(function(error, result) {
            if (result) {
                console.log("Wifi is enabled!");
            } else {
                console.log("Wifi is not enabled!");
            }
            next_step(error);
        });
    },
], function(error) {
    console.log("Done!!");
});

*/

