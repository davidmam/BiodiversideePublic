const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const app = express();

app.use(cors({ origin: "http://localhost:3000" }));

app.get("/api/bird-sound", async (req, res) => {
  const { birdName } = req.query;
  try {
    const response = await fetch(
      `https://www.xeno-canto.org/api/2/recordings?query=${birdName}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching bird sound:", error);
    res.status(500).json({ error: "Failed to fetch bird sound" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server is running on port", PORT);
});
