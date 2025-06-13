const express = require("express");
const mqtt = require("mqtt");
const admin = require("firebase-admin"); /* required for firebase */
const serviceAccount = require("./biodiversidee-b5654-firebase-adminsdk-fbsvc-2caaf35a96.json"); /* firebase credentials */
const cors = require("cors");
/** setup database */
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "biodiversidee-b5654.firebasestorage.app",
});

const db = admin.firestore();
/** end database setup */
const app = express();
const client = mqtt.connect("mqtt://test.mosquitto.org"); /* MQTT broker. Need to update this (set as value read from file?) */
app.use(cors());

client.on("connect", () => {
  client.subscribe("dundeebionet/#", (err) => {
    if (!err) {
      console.log("Subscribed to MQTT topic dundeebionet/#");
    }
  });
});

client.on("message", async (topic, message) => { /** receives topic and message from subscription. */
  const msg = message.toString();
  console.log(`Topic: ${topic}, Message: ${msg}`); 

  const detection = parseDetectionMessage(msg); /** parses message to a detection object. Check the method to see where this is */
  if (detection) {
    try { /** change this bit out for adding to postgres */
      await db.collection("bird_detections").add(detection);
      console.log("Bird detection saved to Firestore:", detection);
      /** end of save to db bit */
    } catch (err) {
      console.error("Error saving to Firestore:", err);
    }
  }
});

client.on("error", (err) => {
  console.error("MQTT Error:", err.message);
});

client.on("offline", () => {
  console.warn("MQTT Client went offline");
});

client.on("reconnect", () => {
  console.log("Reconnecting to MQTT...");
});

function parseDetectionMessage(msg) {
  const [detectionSummary, detailsPart] = msg
    .split("\n")
    .map((line) => line.trim()); /** topic has both title and details separated by \n. We want the details. */

  const detection = { detection_summary: detectionSummary };
  const details = detailsPart.split(";").map((detail) => detail.trim());

  details.forEach((detail) => {
    const match = detail.match(/^(\w+)\s(.+)$/); /** splits on first space */
    if (match) {
      const [_, key, value] = match;
      switch (key) {
        case "species":
          detection.species = value;
          break;
        case "name":
          detection.name = value;
          break;
        case "score":
          detection.score = parseFloat(value);
          break;
        case "time":
          detection.time = value;
          break;
        case "date":
          detection.date = value;
          break;
        case "type":
          detection.type = value;
          break;
        case "id":
          detection.id = value;
          break;
        default:
          console.warn("Unknown key:", key);
      }
    }
  });

  detection.timestamp = new Date(); /** this gives the current time, not the detection time which can be different if there is a backlog of data being processed.
  Need to change this to build the timestamp from date and time given  in the detection
  */

  return detection;
}

app.get("/", async (req, res, next) => {
  try {
    res.send("Hello World");
  } catch (err) {
    next(err);
  }
});

app.get("/keep-alive", async (req, res, next) => {
  try {
    res.send("I'm alive!");
  } catch (err) {
    next(err);
  }
});

app.get("/api/bird-sound", async (req, res) => {
  const { birdName } = req.query;
  try {
    const response = await fetch(
      `https://www.xeno-canto.org/api/2/recordings?query=${birdName}`
    );
    const data = await response.json();
    console.log("Bird sound fetched:", data);
    res.json(data);
  } catch (error) {
    console.error("Error fetching bird sound:", error);
    res.status(500).json({ error: "Failed to fetch bird sound" });
  }
});

app.use((err, req, res, next) => {
  console.error("Global Error:", err.stack);
  res.status(500).send({ message: "Something went wrong!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server is running on port", PORT);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
});
