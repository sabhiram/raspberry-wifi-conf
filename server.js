var async               = require("async"),
    wifi_manager        = require("./app/wifi_manager")(),
    dependency_manager  = require("./app/dependency_manager")(),
    config              = require("./config.json"),
    Gpio                = require('onoff').Gpio;

/*****************************************************************************\
    1. Check for dependencies
    2. Check to see if we are connected to a wifi AP
    3. If connected to a wifi, do nothing -> exit
    4. Convert RPI to act as a AP (with a configurable SSID)
    5. Host a lightweight HTTP server which allows for the user to connect and
       configure the RPIs wifi connection. The interfaces exposed are RESTy so
       other applications can similarly implement their own UIs around the
       data returned.
    6. Once the RPI is successfully configured, reset it to act as a wifi
       device (not AP anymore), and setup its wifi network based on what the
       user picked.
    7. At this stage, the RPI is named, and has a valid wifi connection which
       its bound to, reboot the pi and re-run this script on startup.
\*****************************************************************************/

console.log("Service started");


const btn_Wifi = new Gpio(5, 'in', 'rising', {debounceTimeout: 10});

const TIMEOUT_BTN_WIFI = 10
count_btnWifiClick = 0;
timer_btnWifi = setInterval(listenToWifiResetButton, 1000);

function listenToWifiResetButton() {
    var btnValue = btn_Wifi.readSync();
    if(btnValue == 1){
        count_btnWifiClick = 0;
    }else{
        count_btnWifiClick++;
        if(count_btnWifiClick == TIMEOUT_BTN_WIFI){
            console.log("Reseting WiFi now!");

            async.series([
                // 1. Turn RPI into an access point
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

                // 2. Host HTTP server while functioning as AP, the "api.js"
                //    file contains all the needed logic to get a basic express
                //    server up. It uses a small angular application which allows
                //    us to choose the wifi of our choosing.
                function start_http_server(next_step) {
                    console.log("\nHTTP server running...");
                    require("./app/api.js")(wifi_manager, next_step);
                },
                
            ], function(error) {
                if (error) {
                    console.log("ERROR: " + error);
                }
            });

            count_btnWifiClick = 0;
        }
    }
}

process.on('SIGINT', _ => {
    btn_Wifi.unexport();
    clearInterval(timer_btnWifi)
});


async.series([

    // 1. Check if we have the required dependencies installed
    function test_deps(next_step) {
        dependency_manager.check_deps({
            "binaries": ["dnsmasq", "hostapd", "iw"],
            "files":    ["/etc/dnsmasq.conf"]
        }, function(error) {
            if (error) console.log(" * Dependency error, did you run `sudo npm run-script provision`?");
            next_step(error);
        });
    },

    // 2. Check if wifi is enabled / connected
    function test_is_wifi_enabled(next_step) {
        wifi_manager.is_wifi_enabled(function(error, result_ip) {
			
            if (result_ip) {
                console.log("\nWifi is enabled.");
                var reconfigure = config.access_point.force_reconfigure || false;
                if (reconfigure) {
                    console.log("\nForce reconfigure enabled - try to enable access point");
                }else{
                    return;
                }

            } else if (config.access_point.auto_ap_mode){
                console.log("\nWifi is not enabled, Enabling AP for self-configure");
            }
            next_step(error);
        });
    },
    
    // 3. Turn RPI into an access point
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

    // 4. Host HTTP server while functioning as AP, the "api.js"
    //    file contains all the needed logic to get a basic express
    //    server up. It uses a small angular application which allows
    //    us to choose the wifi of our choosing.
    function start_http_server(next_step) {
        console.log("\nHTTP server running...");
        require("./app/api.js")(wifi_manager, next_step);
    },
    

], function(error) {
    if (error) {
        console.log("ERROR: " + error);
    }
});

