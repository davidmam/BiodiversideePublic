const admin = require("firebase-admin");

const serviceAccount = require("./biodiversidee-b5654-firebase-adminsdk-fbsvc-2caaf35a96.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

async function generateAllTimeAggregationFromDaily() {
  const snapshot = await db.collection("daily_aggregations").get();

  const allTime = {
    species_count: [],
    location_species_count: [],
    species_score_stats: {},
    location_score_stats: [],
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  const speciesCountMap = {};
  const locationSpeciesMap = {};
  const locationScoreMap = {};

  snapshot.forEach((doc) => {
    const data = doc.data();

    data.species_count.forEach(({ name, count }) => {
      const cleanName = name.trim();
      speciesCountMap[cleanName] = (speciesCountMap[cleanName] || 0) + count;
    });

    data.location_species_count.forEach((entry) => {
      const location = entry.location;
      if (!locationSpeciesMap[location]) {
        locationSpeciesMap[location] = {};
      }
      Object.entries(entry).forEach(([key, value]) => {
        if (key !== "location") {
          const cleanKey = key.trim();
          locationSpeciesMap[location][cleanKey] =
            (locationSpeciesMap[location][cleanKey] || 0) + value;
        }
      });
    });

    for (const name in data.species_score_stats) {
      const stat = data.species_score_stats[name];
      const existing = allTime.species_score_stats[name];
      if (existing) {
        const combinedCount = (existing._count || 1) + (stat._count || 1);
        existing.avg =
          (existing.avg * (existing._count || 1) +
            stat.avg * (stat._count || 1)) /
          combinedCount;
        existing.min = Math.min(existing.min, stat.min);
        existing.max = Math.max(existing.max, stat.max);
        existing._count = combinedCount;
      } else {
        allTime.species_score_stats[name] = {
          ...stat,
          _count: stat._count || 1,
        };
      }
    }
  });

  allTime.species_count = Object.entries(speciesCountMap).map(
    ([name, count]) => ({ name, count })
  );

  allTime.location_species_count = Object.entries(locationSpeciesMap).map(
    ([location, speciesObj]) => ({
      location,
      ...speciesObj,
    })
  );

  for (const name in allTime.species_score_stats) {
    delete allTime.species_score_stats[name]._count;
  }

  await db.collection("all-time-aggregation").doc("global-test").set(allTime);

  console.log("All-time aggregation created from daily_aggregation docs.");
}

generateAllTimeAggregationFromDaily().catch(console.error);
