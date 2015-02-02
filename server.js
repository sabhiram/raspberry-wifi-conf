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
iwlist(function(error, result) {
    console.log(util.inspect(result, { depth: null }));
});

wifi_manager.get_wifi_info(function(error, result) {
   console.log(util.inspect(result, { depth: null }));
});


