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

        // Scope function definitions
        $scope.rescan = function() {
            $scope.scan_results = [];
            PiManager.rescan_wifi().then(function(response) {
                if (response.data.status == "SUCCESS") {
                    $scope.scan_results = response.data.scan_results;
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
        };
    }]

);

