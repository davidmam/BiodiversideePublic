const express = require("express");
const mqtt = require("mqtt");
const admin = require("firebase-admin");
const serviceAccount = require("./biodiversidee-b5654-firebase-adminsdk-fbsvc-2caaf35a96.json");
const cors = require("cors");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "biodiversidee-b5654.firebasestorage.app",
});

const db = admin.firestore();

const app = express();
const client = mqtt.connect("mqtt://test.mosquitto.org");
app.use(cors());

client.on("connect", () => {
  client.subscribe("dundeebionet/#", (err) => {
    if (!err) {
      console.log("Subscribed to MQTT topic dundeebionet/#");
    }
  });
});

client.on("message", async (topic, message) => {
  const msg = message.toString();
  console.log(`Topic: ${topic}, Message: ${msg}`);

  const detection = parseDetectionMessage(msg);
  if (detection) {
    try {
      await db.collection("bird_detections").add(detection);
      console.log("Bird detection saved to Firestore:", detection);
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
    .map((line) => line.trim());

  const detection = { detection_summary: detectionSummary };
  const details = detailsPart.split(";").map((detail) => detail.trim());

  details.forEach((detail) => {
    const match = detail.match(/^(\w+)\s(.+)$/);
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

  detection.timestamp = new Date();

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
