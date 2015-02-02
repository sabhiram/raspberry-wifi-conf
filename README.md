# rpi-connect-to-wifi

A Node application which makes connecting your RaspberryPi to your home wifi easier

## Why?

When unable to connect to a wifi network, this service will turn the RPI into a wireless AP. This allows us to connect to it via a phone or other device and configure our home wifi network (for example).

Once configured, it prompts the PI to reboot with the appropriate wifi credentials. If this process fails, it immediately re-enables the PI as an AP which can be configurable again.

## Install

```sh
$git clone git@github.com:sabhiram/rpi-connect-to-wifi.git
$cd rpi-connect-to-wifi
$npm update
$npm start
```

## Usage

This is approximately what occurs when we run this app:

1. Check to see if we are connected to a wifi AP
2. If connected to a wifi, do nothing -> exit
3. Convert RPI to act as a AP (with a configurable SSID)
4. Host a lightweight HTTP server which allows for the user to connect and configure the RPIs wifi connection. The interfaces exposed are RESTy so other applications can similarly implement their own UIs around the data returned.
5. Once the RPI is successfully configured, reset it to act as a wifi device (not AP anymore), and setup its wifi network based on what the user picked.
6. At this stage, the RPI is named, and has a valid wifi connection which its bound to, reboot the pi and re-run this script on startup.

## Testing

TODO: Enable TravisCI, Coveralls

```sh
$npm test
```
