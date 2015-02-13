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
        $scope.scan_results              = [];
        $scope.selected_cell             = null;
        $scope.scan_running              = false;
        $scope.network_passcode          = "";
        $scope.show_passcode_entry_field = false;

        // Scope filter definitions
        $scope.orderScanResults = function(cell) {
            return parseInt(cell.signal_strength);
        }

        $scope.foo = function() { console.log("foo"); }
        $scope.bar = function() { console.log("bar"); }

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
            $scope.network_passcode = "";
            $scope.selected_cell = cell;
            $scope.show_passcode_entry_field = (cell != null) ? true : false;
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

/*****************************************************************************\
    Directive to show / hide / clear the password prompt
\*****************************************************************************/
app.directive("rwcPasswordEntry", function($timeout) {
    return {
        restrict: "E",

        scope: {
            visible:  "=",
            passcode: "=",
            reset:    "&",
            submit:   "&",
        },

        replace: true,          // Use provided template (as opposed to static
                                // content that the modal scope might define in the
                                // DOM)
        template: [
            "<div class='rwc-password-entry-container' ng-class='{\"hide-me\": !visible}'>",
            "    <div class='box'>",
            "         <input type = 'password' placeholder = 'Passcode...' ng-model = 'passcode' />",
            "         <div class = 'btn btn-cancel' ng-click = 'reset(null)'>Cancel</div>",
            "         <div class = 'btn btn-ok' ng-click = 'submit()'>Submit</div>",
            "    </div>",
            "</div>"
        ].join("\n"),

        // Link function to bind modal to the app
        link: function(scope, element, attributes) {
        },
    };
});
