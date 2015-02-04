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
        $scope.selected_index = null;
        $scope.scan_running = false;
        $scope.network_passcode = null;

        // Scope function definitions
        $scope.rescan = function() {
            $scope.scan_results = [];
            $scope.selected_index = null;
            $scope.scan_running = true;
            PiManager.rescan_wifi().then(function(response) {
                console.log(response.data);
                if (response.data.status == "SUCCESS") {
                    $scope.scan_results = response.data.scan_results;
                }
                $scope.scan_running = false;
            });
        }

        $scope.change_selection = function(index) {
            console.log("Change selection to: " + index);
            if (index >= 0 && index < $scope.scan_results.length) {
                $scope.selected_index = index;
            }
        }

        $scope.orderScanResults = function(cell) {
            return parseInt(cell.signal_strength);
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
        };
    }]

);

