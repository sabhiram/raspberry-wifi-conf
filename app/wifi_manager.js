var _       = require("underscore")._,
    async   = require("async"),
    fs      = require("fs"),
    exec    = require("child_process").exec,
    config  = require("../config.json");

// Better template format
_.templateSettings = {
    interpolate: /\{\{(.+?)\}\}/g,
    evaluate :   /\{\[([\s\S]+?)\]\}/g
};

// Helper function to write a given template to a file based on a given
// context
function write_template_to_file(template_path, file_name, context, callback) {
    async.waterfall([

        function read_template_file(next_step) {
            fs.readFile(template_path, {encoding: "utf8"}, next_step);
        },

        function update_file(file_txt, next_step) {
            var template = _.template(file_txt);
            fs.writeFile(file_name, template(context), next_step);
        }

    ], callback);
}

/*****************************************************************************\
    Return a set of functions which we can use to manage and check our wifi
    connection information
\*****************************************************************************/
module.exports = function() {
    // Detect which wifi driver we should use, the rtl871xdrv or the nl80211
    exec("iw list", function(error, stdout, stderr) {
        if (stderr.match(/^nl80211 not found/)) {
            config.wifi_driver_type = "rtl871xdrv";
        }
    });

    // Define some globals
    var ifconfig_fields = {
        "hw_addr":         /ether\s([^\s]+)/,
        "inet_addr":       /inet\s*([^\s\/]+)/,
    },  iwconfig_fields = {
        "ap_addr":         /Access Point:\s([^\s]+)/,
        "ap_ssid":         /ESSID:\"([^\"]+)\"/,
        "unassociated":    /(unassociated)\s+ESSID/,
    },  last_wifi_info = null,
        available_wifi_interfaces = [];
    
    // TODO: Split this up?
    // Detect which wifi interface we should use, if not specified
    exec("find -H /sys/class/net/* -name phy80211 -maxdepth 2 | cut -d/ -f5", function(error, stdout) {
        var interface_array = stdout.split("\n");
        if (interface_array.length > 0) {
            available_wifi_interfaces = interface_array;
            // Allow "auto" or empty to trigger auto selection
            if (!config.wifi_interface || config.wifi_interface.toLowerCase() == "auto") {
                // default to first available wireless interface, revisit if necessary.
                config.wifi_interface = available_wifi_interfaces[0];
            };
        } else {
            console.log("No wireless devices found");
        }
    });

    // Get generic info on an interface
    var _get_wifi_info = function(callback) {
        var output = {
            hw_addr:      "<unknown>",
            inet_addr:    "<unknown>",
            ap_addr:      "<unknown_ap>",
            ap_ssid:      "<unknown_ssid>",
            unassociated: "<unknown>",
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
                run_command_and_set_fields("ip a show dev " + config.wifi_interface, ifconfig_fields, next_step);
            },
            function run_iwconfig(next_step) {
                run_command_and_set_fields("iwconfig " + config.wifi_interface, iwconfig_fields, next_step);
            },
            function generate_ap_ssid(next_step) {
                // Derive ap ssid from prefix and mac address if unset
                if ((typeof config.access_point.ssid == 'undefined') || !config.access_point.ssid) { //no ap ssid set, create one
                    console.log("generating ap ssid...");
                    // configure a prefix for generated ssid, default to "config"
                    var ssid_prefix = (typeof config.access_point.ssid_prefix !== 'undefined')
                        ? config.access_point.ssid_prefix
                        : "config-"; // default prefix if not set
                    
                    var mac_octets = output.hw_addr.split(":");
                    var mac_len = mac_octets.length;

                    config.access_point.ssid = (mac_len == 6)
                        ? ssid_prefix + mac_octets[4] + mac_octets[5] // use the last two octets for a short unique-ish identifier
                        : ssid_prefix; // dunno what we got for a mac address, but it ain't right
                    console.log("ap: " + config.access_point.ssid);
                };
                next_step(null);
            },
        ], function(error) {
            last_wifi_info = output;
            return callback(error, output);
        });
    },

    _reboot_wireless_network = function(wlan_iface, callback) {
        async.series([ // ip link set DEV up|down
            function down(next_step) {
                exec("sudo ip link set " + wlan_iface + " down", function(error, stdout, stderr) {
                    if (!error) console.log("link " + wlan_iface + " down successful...");
                    next_step();
                });
            },
            function up(next_step) {
                exec("sudo ip link set " + wlan_iface + " up", function(error, stdout, stderr) {
                    if (!error) console.log("link " + wlan_iface + " up successful...");
                    next_step();
                });
            },
        ], callback);
    },

    // Wifi related functions
    _is_wifi_enabled_sync = function(info) {
        // If we are not an AP, and we have a valid
        // inet_addr - wifi is enabled!
        //console.log(_is_ap_enabled_sync(info));
        if (null        == _is_ap_enabled_sync(info) &&
            "<unknown>" != info["inet_addr"]         &&
            "Not-Associated" != info["ap_addr"] &&
            "<unknown_ap>" != info["ap_addr"]  ) {
            return info["inet_addr"];
        }
        return null;
    },

    _is_wifi_enabled = function(callback) {
        _get_wifi_info(function(error, info) {
            if (error) return callback(error, null);
            return callback(null, _is_wifi_enabled_sync(info));
        });
    },

    // Access Point related functions
    _is_ap_enabled_sync = function(info) {
        
        var is_ap = info["ap_ssid"] == config.access_point.ssid;
        
        if(is_ap == true){
			return info["ap_ssid"];
		}
		else{
			
			return null;
		}
        
    },

    _is_ap_enabled = function(callback) {
        _get_wifi_info(function(error, info) {
            if (error) return callback(error, null);
            return callback(null, _is_ap_enabled_sync(info));
        });
    },

    // Enables the accesspoint w/ bcast_ssid. This assumes that both
    // dnsmasq and hostapd are installed using:
    // $sudo npm run-script provision
    _enable_ap_mode = function(bcast_ssid, callback) {
        _is_ap_enabled(function(error, result_addr) {
            if (error) {
                console.log("ERROR: " + error);
                return callback(error);
            }

            if (result_addr && !config.access_point.force_reconfigure) {
                console.log("\nAccess point is enabled with ADDR: " + result_addr);
                return callback(null);
            } else if (config.access_point.force_reconfigure) {
                console.log("\nForce reconfigure enabled - reset AP");
            } else {
                console.log("\nAP is not enabled yet... enabling...");
            }

            var context = config.access_point;
            context["enable_ap"] = true;
            context["wifi_driver_type"] = config.wifi_driver_type;
            context["wifi_interface"] = config.wifi_interface;

            // Here we need to actually follow the steps to enable the ap
            async.series([
                // Enable the access point ip and netmask + static
                // DHCP for the wlan0 interface
                function update_interfaces(next_step) {
                    write_template_to_file(
                        "./assets/etc/dhcpcd/dhcpcd.ap.template",
                        "/etc/dhcpcd.conf",
                        context, next_step);
                },

                // Enable the interface in the dhcp server
                function update_dhcp_interface(next_step) {
                    write_template_to_file(
                        "./assets/etc/dnsmasq/dnsmasq.ap.template",
                        "/etc/dnsmasq.conf",
                        context, next_step);
                },

                // Enable hostapd.conf file
                function update_hostapd_conf(next_step) {
                    write_template_to_file(
                        "./assets/etc/hostapd/hostapd.conf.template",
                        "/etc/hostapd/hostapd.conf",
                        context, next_step);
                },

                function restart_dhcp_service(next_step) {
                    exec("sudo systemctl restart dhcpcd", function(error, stdout, stderr) {
                        if (!error) console.log("... dhcpcd server restarted!");
                        else console.log("... dhcpcd server failed! - " + stdout);
                        next_step();
                    });
                },

                
                function reboot_network_interfaces(next_step) {
                    _reboot_wireless_network(config.wifi_interface, next_step);
                },

                function restart_hostapd_service(next_step) {
                    exec("sudo systemctl restart hostapd", function(error, stdout, stderr) {
                        //console.log(stdout);
                        if (!error) console.log("... hostapd restarted!");
                        next_step();
                    });
                },
                
                function restart_dnsmasq_service(next_step) {
                    exec("sudo systemctl restart dnsmasq", function(error, stdout, stderr) {
                        if (!error) console.log("... dnsmasq server restarted!");
                        else console.log("... dnsmasq server failed! - " + stdout);
                        next_step();
                    });
                },
                

            ], callback);
        });
    },

    // Disables AP mode and reverts to wifi connection
    _enable_wifi_mode = function(connection_info, callback) {

        _is_wifi_enabled(function(error, result_ip) {
            if (error) return callback(error);

            if (result_ip) {
                console.log("\nWifi connection is enabled with IP: " + result_ip);
                return callback(null);
            }

            async.series([
            
				
				//Add new network
				function update_wpa_supplicant(next_step) {
                    write_template_to_file(
                        "./assets/etc/wpa_supplicant/wpa_supplicant.conf.template",
                        "/etc/wpa_supplicant/wpa_supplicant-" + config.wifi_interface + ".conf",
                        connection_info, next_step);
				},

                function update_interfaces(next_step) {
                    write_template_to_file(
                        "./assets/etc/dhcpcd/dhcpcd.station.template",
                        "/etc/dhcpcd.conf",
                        connection_info, next_step);
                },

                // Enable the interface in the dhcp server
                function update_dhcp_interface(next_step) {
                    write_template_to_file(
                        "./assets/etc/dnsmasq/dnsmasq.station.template",
                        "/etc/dnsmasq.conf",
                        connection_info, next_step);
                },

                // Enable hostapd.conf file
                function update_hostapd_conf(next_step) {
                    write_template_to_file(
                        "./assets/etc/hostapd/hostapd.conf.station.template",
                        "/etc/hostapd/hostapd.conf",
                        connection_info, next_step);
                },

				function restart_dnsmasq_service(next_step) {
                    exec("sudo systemctl stop dnsmasq", function(error, stdout, stderr) {
                        if (!error) console.log("... dnsmasq server stopped!");
                        else console.log("... dnsmasq server failed! - " + stdout);
                        next_step();
                    });
                },
                
                function restart_hostapd_service(next_step) {
                    exec("sudo systemctl stop hostapd", function(error, stdout, stderr) {
                        //console.log(stdout);
                        if (!error) console.log("... hostapd stopped!");
                        next_step();
                    });
                },
                
                function restart_dhcp_service(next_step) {
                    exec("sudo systemctl restart dhcpcd", function(error, stdout, stderr) {
                        if (!error) console.log("... dhcpcd server restarted!");
                        else console.log("... dhcpcd server failed! - " + stdout);
                        next_step();
                    });
                },

                function enable_systemd_wpa_supplicant_service(next_step) {
                    exec("systemctl enable wpa_supplicant@" + config.wifi_interface + ".service", function(error, stdout, stderr) {
                        if (!error) {
                            console.log("Systemd service enabled for " + config.wifi_interface + "!");
                        };
                        next_step(null);
                    });
                },
                function start_systemd_wpa_supplicant_service(next_step) {
                    exec("systemctl start wpa_supplicant@" + config.wifi_interface + ".service", function (error, stdout, stderr) {
                        if (!error) {
                            console.log("Systemd service started for " + config.wifi_interface + "!");
                        };
                        next_step(null);
                    });
                },

                function reboot_network_interfaces(next_step) {
                    _reboot_wireless_network(config.wifi_interface, next_step);
                },

            ], callback);
        });

    };

    return {
        get_wifi_info:           _get_wifi_info,
        reboot_wireless_network: _reboot_wireless_network,

        is_wifi_enabled:         _is_wifi_enabled,
        is_wifi_enabled_sync:    _is_wifi_enabled_sync,

        is_ap_enabled:           _is_ap_enabled,
        is_ap_enabled_sync:      _is_ap_enabled_sync,

        enable_ap_mode:          _enable_ap_mode,
        enable_wifi_mode:        _enable_wifi_mode,
    };
}
