"use strict";

/***
 *  Define the app and inject any modules we wish to
 *  refer to.
***/
var app = angular.module("RpiWifiConfig", []);

/******************************************************************************\
Function:
    AppController

Dependencies:
    ...

Description:
    Main application controller
\******************************************************************************/
app.controller("AppController", ["PiManager", "$scope", "$location", "$timeout",

    function(PiManager, $scope, $location, $timeout) {
        // Scope variable declaration
        $scope.scan_results = [];
        $scope.selected_cell = null;
        $scope.scan_running = false;
        $scope.network_passcode = "";

        // Scope function definitions
        $scope.rescan = function() {
            $scope.scan_results = [];
            $scope.selected_cell = null;
            $scope.scan_running = true;
            PiManager.rescan_wifi().then(function(response) {
                console.log(response.data);
                if (response.data.status == "SUCCESS") {
                    $scope.scan_results = response.data.scan_results;
                }
                $scope.scan_running = false;
            });
        }

        $scope.change_selection = function(cell) {
            console.log("Change selection to: " + cell.ssid);
            $scope.network_passcode = "";
            $scope.selected_cell = cell;
        }

        $scope.orderScanResults = function(cell) {
            return parseInt(cell.signal_strength);
        }

        $scope.submit_selection = function() {
            if (!$scope.selected_cell) return;

            var wifi_info = {
                wifi_ssid:      $scope.selected_cell["ssid"],
                wifi_passcode:  $scope.network_passcode,
            };

            PiManager.enable_wifi(wifi_info).then(function(response) {
                console.log(response.data);
                if (response.data.status == "SUCCESS") {
                    console.log("AP Enabled - nothing left to do...");
                }
            });
        }

        // Defer load the scanned results from the rpi
        $scope.rescan();
    }]

);

/*****************************************************************************\
    Service to hit the rpi wifi config server
\*****************************************************************************/
app.service("PiManager", ["$http",

    function($http) {
        return {
            rescan_wifi: function() {
                return $http.get("/api/rescan_wifi");
            },
            enable_wifi: function(wifi_info) {
                return $http.post("/api/enable_wifi", wifi_info);
            }
        };
    }]

);

