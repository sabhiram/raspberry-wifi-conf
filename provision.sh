#!/bin/bash
apt-get update -qq
apt-get upgrade -qq
apt-get install -qq dnsmasq hostapd iw dhcpcd nodejs npm
npm update --quiet
npm install bower -g --quiet
bower install
apt remove --purge -qq NetworkManager
