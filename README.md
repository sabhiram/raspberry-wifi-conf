# raspberry-wifi-conf

A Node application which makes connecting your RaspberryPi to your home wifi easier

## Why?

When unable to connect to a wifi network, this service will turn the RPI into a wireless AP. This allows us to connect to it via a phone or other device and configure our home wifi network (for example).

Once configured, it prompts the PI to reboot with the appropriate wifi credentials. If this process fails, it immediately re-enables the PI as an AP which can be configurable again.

This project broadly follows these [instructions](http://www.maketecheasier.com/set-up-raspberry-pi-as-wireless-access-point/) in setting up a RaspberryPi as a wireless AP.

## Install

```sh
$git clone git@github.com:sabhiram/raspberry-wifi-conf.git
$cd raspberry-wifi-conf
$npm update
$sudo npm run-script provision
$sudo npm start
```

#### Gotchas

The `hostapd` application does not like to behave itself on some wifi adapters (RTL8192CU et al). This link does a good job explaining the issue and the remedy: [Edimax Wifi Issues](http://willhaley.com/blog/raspberry-pi-hotspot-ew7811un-rtl8188cus/). The gist of what you need to do is as follows:

```
# run iw to detect if you have a non nl80211 driver
$iw list
```

If the above says `nl80211 not found.` - then you probably need to update the `hostapd` binary as follows:
```
$wget http://www.adafruit.com/downloads/adafruit_hostapd.zip 
$unzip hostapd.zip
$sudo mv /usr/sbin/hostapd /usr/sbin/hostapd.OLD
$sudo mv hostapd /usr/sbin/hostapd
$sudo chmod 755 /usr/sbin/hostapd
```

Also note that since I run the `rtl871xdrv`, I have this value hard-coded into the `/assets/etc/hostapd/hostapd.conf.template`. For the `nl80211` devices, change the conf template as so:

```
interface={{ wifi_interface }}

driver=nl80211
#driver=rtl871xdrv
```

TODO: Make the server smarter: once dependency checks and provisioning is built into the app, we can do the `iwlist` check and copy the appropriate version of `hostapd`.

## Usage

This is approximately what occurs when we run this app:

1. Check to see if we are connected to a wifi AP
2. If connected to a wifi, do nothing -> exit
3. Convert RPI to act as a AP (with a configurable SSID)
4. Host a lightweight HTTP server which allows for the user to connect and configure the RPIs wifi connection. The interfaces exposed are RESTy so other applications can similarly implement their own UIs around the data returned.
5. Once the RPI is successfully configured, reset it to act as a wifi device (not AP anymore), and setup its wifi network based on what the user picked.
6. At this stage, the RPI is named, and has a valid wifi connection which its bound to.

Typically, I have the following line in my `/etc/rc.local` file:
```
cd /home/pi/raspberry-wifi-conf
sudo /usr/bin/node server.js
```

Note that this is run in a blocking fashion, in that this script will have to exit before we can proceed with others defined in `rc.local`. This way I can guarantee that other services which might rely on wifi will have said connection before being run. If this is not the case for you, and you just want this to run (if needed) in the background, then you can do:

```
cd /home/pi/raspberry-wifi-conf
sudo /usr/bin/node server.js < /dev/null &
```

## Testing

TODO: Write simple tests for external libs
TODO: Enable TravisCI, Coveralls

## TODO

1. Automate the deployment of alternate `hostapd` application
2. Automate provisioning of the application dependencies
3. Make the running of scripts cleaner and more easy to read
4. ifup should never be allowed to fail... same w/ the "start" pieces of various services. Perhaps we need to tease the restart into stop and start and allow the stop to fail.
