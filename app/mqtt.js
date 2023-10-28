import { mqtt, iot, http } from 'aws-iot-device-sdk-v2';
import path from 'node:path';
import { TextDecoder } from 'node:util';
import * as fs from 'node:fs';

// type Args = { [index: string]: any };

let mqttConnection;
const iotConfig = {
  cert: path.resolve(__dirname, '../assets/certs/illumibot.cert.pem'),
  key: path.resolve(__dirname, '../assets/certs/illumibot.private.key'),
  ca_file: path.resolve(__dirname, '../assets/certs/root-CA.crt'),
  client_id: 'illumibot-4444',
  endpoint: 'a3if4p9wci5r3z-ats.iot.us-east-1.amazonaws.com',
}

// Creates and returns a MQTT connection using a certificate file and key file
function buildConnection(argv) {
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

function buildIllumiId(id) {
  return `illumibot${id}`;
}

function getMachineId() {
  let machineId;
  try {
    machineId = fs.readFileSync('/etc/machine-id').toString().trim();
    console.info('Found machine-id', machineId);
  } catch (err) {
    console.log('Error reading machineId:', err);
  }
  return machineId;
}

function getDataTopicPath() {
  const machineId = getMachineId();
  return buildIllumiId(`/${machineId}/data`);
}

function getStateTopicPath() {
  const machineId = getMachineId();
  return buildIllumiId(`/${machineId}/state`);
}

function getMQTTConnection() {
  if (!mqttConnection) {
    console.info("Getting new MQTT connection...");
    mqttConnection = buildConnection(iotConfig);
  } else {
    console.info("Reusing MQTT connection...");
  }
  return mqttConnection;
}

async function connectMQTT() {
  const connection = getMQTTConnection();
  console.log("Connecting...");
  await connection.connect()
  console.log("Connection completed.");
}

async function disconnectMQTT() {
  const connection = getMQTTConnection();
  console.log("Disconnecting...");
  await connection.disconnect()
  console.log("Disconnect completed.");
}

module.exports = {
  getMachineId,
  getDataTopicPath,
  getStateTopicPath,
  getMQTTConnection,
  connectMQTT,
  disconnectMQTT,
};

