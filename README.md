# rpi-connect-to-wifi

A Node application which makes connecting to your home wifi easier

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

Ideally this service runs on the PIs startup. It essentilly checks the currently configured wifi connection, and on failure switches to AP mode. 

## Testing

TODO: Enable TravisCI, Coveralls

```sh
$npm test
```
