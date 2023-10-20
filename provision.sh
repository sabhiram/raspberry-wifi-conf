#!/bin/bash
echo Be patient, this is slow and as silent as I could make it...
apt-get update -qq
apt-get upgrade -qq
apt-get install -qq dnsmasq hostapd iw dhcpcd nodejs npm
npm update --quiet
npm install bower -g --quiet
bower install --allow-root
apt remove --purge -qq NetworkManager
