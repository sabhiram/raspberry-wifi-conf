var path       = require("path"),
    util       = require("util"),
    iwlist     = require("./iwlist"),
    express    = require("express"),
    bodyParser = require('body-parser'),
    fs         = require("fs"),
    dns        = require('dns'),
    request    = require('request'),
    config     = require("../config.json"),
    http_test  = config.http_test_only;

// Helper function to log errors and send a generic status "SUCCESS"
// message to the caller
function log_error_send_success_with(success_obj, error, response) {
    if (error) {
        console.log("ERROR: " + error);
        response.send({ status: "ERROR", error: error });
    } else {
        success_obj = success_obj || {};
        success_obj["status"] = "SUCCESS";
        response.send(success_obj);
    }
    response.end();
}

function checkInternet(callback) {
    dns.resolve('www.google.com', function(err) {
        if (err) {
            callback(false);
        } else {
            callback(true);
        }
    });
}

function sendJsonFile() {
    fs.readFile('/tmp/userDeviceData.json', 'utf8', function(err, data) {
        if (err) {
            console.log('Error reading file:', err);
            return;
        }
        const options = {
            url: 'http://your-server-url.com/api/endpoint',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: data
        };
        request(options, function(error, response, body) {
            if (error) {
                console.log('Error sending file:', error);
                return;
            }
            console.log('Successfully sent file');
        });
    });
}

/*****************************************************************************\
    Returns a function which sets up the app and our various routes.
\*****************************************************************************/
module.exports = function(wifi_manager, callback) {
    var app = express();

    // Configure the app
    app.set("view engine", "ejs");
    app.set("views", path.join(__dirname, "views"));
    app.set("trust proxy", true);

    // Setup static routes to public assets
    app.use(express.static(path.join(__dirname, "public")));
    app.use(bodyParser.json());

    // Setup HTTP routes for rendering views
    app.get("/", function(request, response) {
        response.render("index");
    });

    // Setup HTTP routes for various APIs we wish to implement
    // the responses to these are typically JSON
    app.get("/api/rescan_wifi", function(request, response) {
        console.log("Server got /rescan_wifi");
        iwlist(function(error, result) {
            log_error_send_success_with(result[0], error, response);
        });
    });

    app.post("/api/register_device", function(request, response) {
        console.log('Server got /register_device');
        const userId = request.body.user_id;
        const deviceId = request.body.device_id;
        const data = {
            user_id: userId,
            device_id: deviceId
        };
        fs.writeFile('/tmp/userDeviceData.json', JSON.stringify(data), (err) => {
            if (err) {
                console.log('Error writing file:', err);
                response.status(500).send('Error writing file');
            } else {
                console.log('Successfully wrote file with data', data);
                response.status(200).send('Successfully wrote file');
            }
        });
    });

    app.post("/api/enable_wifi", function(request, response) {
        var conn_info = {
            wifi_ssid:      request.body.wifi_ssid,
            wifi_passcode:  request.body.wifi_passcode,
        };

        // TODO: If wifi did not come up correctly, it should fail
        // currently we ignore ifup failures.
        wifi_manager.enable_wifi_mode(conn_info, function(error) {
            if (error) {
                console.log("Enable Wifi ERROR: " + error);
                console.log("Attempt to re-enable AP mode");
                wifi_manager.enable_ap_mode(config.access_point.ssid, function(error) {
                    console.log("... AP mode reset");
                });
                response.redirect("/");
            }
            // Success! - exit
            console.log("Wifi Enabled! - Exiting");
            setInterval(function() {
                checkInternet(function(isConnected) {
                    if (isConnected) {
                        
                    } else {
                        console.log('No internet connection');
                    }
                });
            }, 10000); // Check every 10 seconds
            response.status(200).send('Wifi Enabled!');
            // process.exit(0);
        });
    });

    // Listen on our server
    app.listen(config.server.port);
}
