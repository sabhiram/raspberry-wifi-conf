#!/bin/bash

# exit with error code if any of the commands above fails
set -e

systemctl daemon-reload
systemctl stop dnsmasq
systemctl disable dnsmasq
systemctl stop hostapd
systemctl disable hostapd
systemctl restart dhcpcd
systemctl restart networking

exit 0