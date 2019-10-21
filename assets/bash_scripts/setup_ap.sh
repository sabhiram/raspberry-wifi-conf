#!/bin/bash

# exit with error code if any of the commands above fails
set -e

systemctl stop dhcpcd 
# reload the new settings of dhcpcd service
systemctl daemon-reload
systemctl start dhcpcd

systemctl enable dnsmasq
systemctl start dnsmasq

systemctl enable hostapd
systemctl start hostapd

systemctl restart networking

# the only way to reload the static ip set in the dhcpcd.conf file 
# is to flush the current ip (if exist)
ip addr flush dev wlan0

# reload both dhcpcd and networking services to set the static ip
systemctl restart dhcpcd
systemctl restart networking

exit 0