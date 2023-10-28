#!/bin/bash
echo Be patient, this is slow and as silent as I could make it...
apt-get update -qq
apt-get upgrade -qq
apt-get install -qq dnsmasq hostapd iw dhcpcd nodejs npm
systemctl unmask hostapd
npm update --quiet
npm install bower -g --quiet
bower install --allow-root
apt-get remove --purge -qq network-manager
apt-get autoremove -qq
mkdir -p /opt/armbian-wifi-conf
cp -r * /opt/armbian-wifi-conf
cp assets/init.d/armbian-wifi-conf.service /lib/systemd/system/
systemctl daemon-reload
systemctl enable armbian-wifi-conf