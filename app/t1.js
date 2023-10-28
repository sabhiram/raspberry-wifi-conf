import { mqtt, iot, http } from 'aws-iot-device-sdk-v2';
import * as mqttLib from './mqtt';

async function main() {
  const decoder = new TextDecoder('utf8');
  const topicPath = mqttLib.getDataTopicPath();
  console.info("topicPath", topicPath);
  await mqttLib.connectMQTT();
  const connection = mqttLib.getMQTTConnection();
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

  const msg = {
    type: "prompt",
    workflow: {
      workflow: "txt2img",
      positivePrompt: "photo of a dog",
      steps: 60,
      seed: 5000,
    },
    promptId: 'abc',
  };
  const json = JSON.stringify(msg);
  console.info('Publishing message', json);
  await connection.publish(topicPath, json, mqtt.QoS.AtLeastOnce);
}

(async function() {
  await main();
})();
