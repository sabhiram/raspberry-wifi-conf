var async               = require("async"),
    wifi_manager        = require("./app/wifi_manager")(),
    config              = require("./config.json");

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
            if (result_ip) {
                console.log("\nWifi is enabled, and IP " + result_ip + " assigned");
                process.exit(0);
            } else {
                console.log("\nWifi is not enabled, Enable AP for self-configure");
            }
            next_step(error);
        });
    },

    // 2. Turn RPI into an access point
    function enable_rpi_ap(next_step) {
        wifi_manager.enable_ap_mode(config.access_point.ssid, function(error) {
            if(error) {
                console.log("... AP Enable ERROR: " + error);
            } else {
                console.log("... AP Enable Success!");
            }
            next_step(error);
        });
    },

    // 3. Host HTTP server while functioning as AP, the "api.js"
    //    file contains all the needed logic to get a basic express
    //    server up. It uses a small angular application which allows
    //    us to choose the wifi of our choosing.
    function enable_express_server(next_step) {
        require("./app/api.js")(wifi_manager, next_step);
    },

], function(error) {
    if (error) {
        console.log("ERROR: " + error);
    }
});
