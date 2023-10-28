import { mqtt, iot, http, auth } from 'aws-iot-device-sdk-v2';
import { TextDecoder } from 'node:util';
import * as fs from 'node:fs';

type Args = { [index: string]: any };

// Creates and returns a MQTT connection using a certificate file and key file
function build_connection(argv: Args): mqtt.MqttClientConnection {
  let config_builder = iot.AwsIotMqttConnectionConfigBuilder.new_mtls_builder_from_path(argv.cert, argv.key);

  if (argv.proxy_host) {
    config_builder.with_http_proxy_options(new http.HttpProxyOptions(argv.proxy_host, argv.proxy_port));
  }
  if (argv.ca_file != null) {
    config_builder.with_certificate_authority_from_path(undefined, argv.ca_file);
  }

  config_builder.with_clean_session(false);
  config_builder.with_client_id(argv.client_id || "test-" + Math.floor(Math.random() * 100000000));
  config_builder.with_endpoint(argv.endpoint);
  const config = config_builder.build();

  const client = new mqtt.MqttClient();
  return client.new_connection(config);
}

async function main(argv: Args) {
  let machineId;
  try {
    machineId = fs.readFileSync('/etc/machine-id').toString().trim();
    console.info('Found machine-id', machineId);
  } catch (err) {
    console.log('Error reading machineId:', err);
  }

  const decoder = new TextDecoder('utf8');
  const topicPath = `illumibot/${machineId}`;
  const topicStatePath = `illumibot/${machineId}/state`;

  console.log('topicPath', topicPath);


  // common_args.apply_sample_arguments(argv);
  const connection = build_connection(argv);

  // force node to wait 20 seconds before killing itself, promises do not keep node alive
  // ToDo: we can get rid of this but it requires a refactor of the native connection binding that includes
  //    pinning the libuv event loop while the connection is active or potentially active.
  const timer = setInterval(() => { }, 20 * 1000);

  console.log("Connecting...");
  await connection.connect()
  console.log("Connection completed.");


  await connection.subscribe(topicPath, mqtt.QoS.AtLeastOnce, async (topic, payload, dup, qos, retain) => {
    const json = decoder.decode(payload);
    console.log(`Publish received. topic:"${topic}" dup:${dup} qos:${qos} retain:${retain}`);
    console.log(`Payload: ${json}`);
    try {
      const message = JSON.parse(json);
      console.info("Parsed json", message);
    }
    catch (error) {
      console.log("Warning: Could not parse message as JSON...");
    }
  })

  // console.log("Disconnecting...");
  // await connection.disconnect()
  // console.log("Disconnect completed.");

  // Allow node to die if the promise above resolved
  clearTimeout(timer);
}

(async function() {
  await main({
    cert: './assets/certs/illumibot.cert.pem',
    key: './assets/certs/illumibot.private.key',
    ca_file: './assets/certs/root-CA.crt',
    client_id: 'illumibot-4444',
    endpoint: 'a3if4p9wci5r3z-ats.iot.us-east-1.amazonaws.com',
  });
})();
