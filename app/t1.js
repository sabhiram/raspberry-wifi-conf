import { mqtt, iot, http } from 'aws-iot-device-sdk-v2';
import * as mqttLib from './mqtt';
var fs = require("fs"),
    https = require('https'),
    url = require('url'),
    path = require('path'),
    exec = require("child_process").exec;

var getFileFromUrl = (fileUrl) => {
  //#yolo
  return path.basename(url.parse(fileUrl).pathname);
};

async function download(fileUrl, dest) {
  return new Promise((res,rej) => {
    //#HACK
    //clean up file destination and add url filename if last character is /
    if (dest.slice(-1) === '/') {
      dest = dest + getFileFromUrl(fileUrl);
    }

    const file = fs.createWriteStream(dest);
    let fileInfo = null;

    const request = https.get(fileUrl, response => {
      if (response.statusCode !== 200) {
        fs.unlink(dest, () => {
          rej(new Error(`Failed to get ${fileUrl} (${response.statusCode})`))
        });
        return;
      }

      fileInfo = {
        mime: response.headers['content-type'],
        size: parseInt(response.headers['content-length'], 10)
      };
      
      response.pipe(file);
    });

    request.on('finish', () => resolve(fileInfo));

    request.on('error', err => {
      fs.unlink(dest, () => {
        rej(err);
      });
    });

    file.on('error', err => {
      fs.unlink(dest, () => {
        rej(err);
      });
    });

    request.end();
  });
}

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
      if (message.job && message.job.status && message.job.status == "completed") {
        cdnUrl = message.sourceImage.url;
        // download image to drive, e.g. /opt/lumibot/cache/$PROMPTID/$FILENAME
        var filenameFromUrl = getFileFromUrl(cdnUrl);
        var fileTarget = `/opt/illumibot/cache/${message.job.promptId}/${filenameFromUrl}`;
        await download(cdnUrl, fileTarget);
        console.log('displaying image...');
        exec(`ffmpeg -stream_loop -1 -i ${fileTarget} -pix_fmt bgra -f fbdev /dev/fb0`);
      }
    }
    catch (error) {
      console.log("Warning: Could not parse message as JSON...");
      console.log(error);
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
