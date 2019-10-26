
var Gpio            = require('onoff').Gpio,
    config          = require("../config.json"),
    async           = require("async");

module.exports = function(wifi_manager) {
    
    const btn_Wifi = new Gpio(config.access_point.physical_button.pin, 'in', 'rising', {debounceTimeout: 10});

    function _start(){
        
        count_btnWifiClick = 0;
        timer_btnWifi = setInterval(listenToWifiResetButton, 1000);
    
        function listenToWifiResetButton() {
            var btn_Value = btn_Wifi.readSync();
            if(btn_Value == 1){
                count_btnWifiClick = 0;
            }else{
                count_btnWifiClick++;
                if(count_btnWifiClick == config.access_point.physical_button.timeout){
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
                            require("../app/api.js")(wifi_manager, next_step);
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
    }

    function _stop(){
        btn_Wifi.unexport();
        clearInterval(timer_btnWifi)
    }


    return {
        start:           _start,
        stop:           _stop
    };
}