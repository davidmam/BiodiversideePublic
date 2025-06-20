const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const serviceAccount = require("./biodiversidee-b5654-firebase-adminsdk-fbsvc-2caaf35a96.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

async function backfillDailyAggregations(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, "utf8");
    const lines = fileContent.trim().split("\n");

    const startIndex = lines[0].includes(
      "Name\tSpecies\tScore\tLocation\tTimestamp"
    )
      ? 1
      : 0;

    const detections = [];
    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split("\t");
      if (parts.length >= 5) {
        detections.push({
          name: parts[0],
          species: parts[1],
          score: parseFloat(parts[2]),
          id: parts[3],
          timestamp: new Date(parts[4]),
        });
      }
    }

    const detectionsByDay = {};

    detections.forEach((detection) => {
      const date = detection.timestamp.toISOString().split("T")[0];
      if (!detectionsByDay[date]) {
        detectionsByDay[date] = [];
      }
      detectionsByDay[date].push(detection);
    });

    for (const date in detectionsByDay) {
      const dayDetections = detectionsByDay[date];
      await processDailyAggregation(date, dayDetections);
    }

    console.log(
      `Successfully processed ${detections.length} detections across ${
        Object.keys(detectionsByDay).length
      } days.`
    );
  } catch (error) {
    console.error("Error processing bird detections:", error);
  }
}

async function processDailyAggregation(date, detections) {
  console.log(`Processing ${detections.length} detections for ${date}`);

  const nameScores = {};
  const locationScores = {};
  const locationNameCountMap = {};
  const nameCountArr = [];
  const locationScoreStatsArr = [];

  detections.forEach((detection) => {
    const { name, id: location, score } = detection;

    let nameEntry = nameCountArr.find((entry) => entry.name === name);
    if (nameEntry) {
      nameEntry.count += 1;
    } else {
      nameCountArr.push({ name, count: 1 });
    }

    if (!locationNameCountMap[location]) {
      locationNameCountMap[location] = {};
    }
    if (locationNameCountMap[location][name]) {
      locationNameCountMap[location][name] += 1;
    } else {
      locationNameCountMap[location][name] = 1;
    }

    if (!nameScores[name]) {
      nameScores[name] = [];
    }
    nameScores[name].push(score);

    if (!locationScores[location]) {
      locationScores[location] = [];
    }
    locationScores[location].push(score);
  });

  const locationNameCountArr = Object.keys(locationNameCountMap).map(
    (location) => {
      const nameCountObj = { location };

      Object.keys(locationNameCountMap[location]).forEach((name) => {
        nameCountObj[name] = locationNameCountMap[location][name];
      });

      return nameCountObj;
    }
  );

  const nameScoreStatsObj = {};
  for (const name in nameScores) {
    const scores = nameScores[name];
    const avgScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    nameScoreStatsObj[name] = {
      avg: avgScore,
      min: minScore,
      max: maxScore,
    };
  }

  const locationScoreStatsObj = {};
  for (const location in locationScores) {
    const scores = locationScores[location];
    const avgScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    locationScoreStatsObj[location] = {
      avgScore,
      minScore,
      maxScore,
    };
  }

  const locationDiversityStatsArr = Object.entries(locationNameCountMap).map(
    ([location, speciesCountMap]) => {
      const counts = Object.values(speciesCountMap);
      const total = counts.reduce((a, b) => a + b, 0);
      let shannon = 0;
      let simpson = 0;

      counts.forEach((count) => {
        const p = count / total;
        if (p > 0) {
          shannon -= p * Math.log(p);
          simpson += p * p;
        }
      });

      return {
        location,
        shannon_index: shannon,
        simpson_index: 1 - simpson,
      };
    }
  );

  let totalDetections = nameCountArr.reduce(
    (sum, entry) => sum + entry.count,
    0
  );
  let shannonIndex = 0;
  let simpsonIndex = 0;

  if (totalDetections > 0) {
    nameCountArr.forEach(({ count }) => {
      const p = count / totalDetections;
      if (p > 0) {
        shannonIndex -= p * Math.log(p);
        simpsonIndex += p * p;
      }
    });
  }

  const dateParts = date.split("-");
  const detectionDate = new Date(
    parseInt(dateParts[0]),
    parseInt(dateParts[1]) - 1,
    parseInt(dateParts[2])
  );
  const nextDay = new Date(detectionDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const nextDayTimestamp = admin.firestore
    ? admin.firestore.Timestamp.fromDate(nextDay)
    : nextDay.toISOString();

  const aggregationDoc = {
    date: date,
    species_count: nameCountArr,
    location_species_count: locationNameCountArr,
    species_score_stats: nameScoreStatsObj,
    location_score_stats: locationScoreStatsObj,
    shannon_index: shannonIndex,
    simpson_index: 1 - simpsonIndex,
    location_diversity_stats: locationDiversityStatsArr,
    timestamp: nextDayTimestamp,
  };

  await db.collection("daily_aggregations").doc(date).set(aggregationDoc);

  console.log(
    "Aggregated bird detections for",
    date,
    "with timestamp set to",
    nextDay.toISOString()
  );
}

const birdDetectionsFile = path.join(__dirname, "all_detections.txt");

backfillDailyAggregations(birdDetectionsFile)
  .then(() => console.log("Daily aggregation backfill complete!"))
  .catch((err) => console.error("Error during backfill:", err));
