const admin = require("firebase-admin");

const serviceAccount = require("./biodiversidee-b5654-firebase-adminsdk-fbsvc-2caaf35a96.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

async function backfillWeeklyAggregations() {
  console.log("Starting weekly aggregations backfill...");

  try {
    const dailyAggsSnapshot = await db
      .collection("daily_aggregations")
      .orderBy("date", "asc")
      .get();

    if (dailyAggsSnapshot.empty) {
      console.log("No daily aggregations found to process");
      return;
    }

    const weeklyGroups = {};

    dailyAggsSnapshot.forEach((doc) => {
      const aggregation = doc.data();
      const date = new Date(aggregation.date);

      const dayOfWeek = date.getDay();
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - mondayOffset);

      const weekBeginningDate = startOfWeek.toISOString().split("T")[0];

      if (!weeklyGroups[weekBeginningDate]) {
        weeklyGroups[weekBeginningDate] = [];
      }

      weeklyGroups[weekBeginningDate].push(aggregation);
    });

    console.log(`Found ${Object.keys(weeklyGroups).length} weeks to process`);

    for (const [weekBeginningDate, dailyAggregations] of Object.entries(
      weeklyGroups
    )) {
      console.log(
        `Processing week beginning ${weekBeginningDate} (Monday) with ${dailyAggregations.length} daily records`
      );

      const nameCounts = {};
      const locationCounts = {};
      const nameScores = {};
      const locationScores = {};

      dailyAggregations.forEach((aggregation) => {
        const {
          species_count,
          location_species_count,
          species_score_stats,
          location_score_stats,
        } = aggregation;

        species_count.forEach(({ name, count }) => {
          if (nameCounts[name]) {
            nameCounts[name] += count;
          } else {
            nameCounts[name] = count;
          }
        });

        location_species_count.forEach(({ location, ...nameCounts }) => {
          if (locationCounts[location]) {
            Object.keys(nameCounts).forEach((name) => {
              locationCounts[location][name] =
                (locationCounts[location][name] || 0) + nameCounts[name];
            });
          } else {
            locationCounts[location] = { ...nameCounts };
          }
        });

        Object.keys(species_score_stats).forEach((name) => {
          const { avg, min, max } = species_score_stats[name];

          if (nameScores[name]) {
            nameScores[name].push({ avg, min, max });
          } else {
            nameScores[name] = [{ avg, min, max }];
          }
        });

        Object.keys(location_score_stats).forEach((location) => {
          const { avgScore, minScore, maxScore } =
            location_score_stats[location];

          if (locationScores[location]) {
            locationScores[location].push({ avgScore, minScore, maxScore });
          } else {
            locationScores[location] = [{ avgScore, minScore, maxScore }];
          }
        });
      });

      const speciesCountArr = Object.keys(nameCounts).map((name) => ({
        name,
        count: nameCounts[name],
      }));

      const totalDetections = Object.values(nameCounts).reduce(
        (sum, count) => sum + count,
        0
      );

      let shannonIndex = 0;
      let simpsonIndex = 0;

      if (totalDetections > 0) {
        Object.values(nameCounts).forEach((count) => {
          const p = count / totalDetections;
          shannonIndex -= p * Math.log(p);
          simpsonIndex += p * p;
        });
      }

      const simpsonDiversityIndex = 1 - simpsonIndex;

      const locationDiversityStatsArr = Object.entries(locationCounts).map(
        ([location, speciesCounts]) => {
          const counts = Object.values(speciesCounts);
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

      const locationSpeciesCountArr = Object.keys(locationCounts).map(
        (location) => {
          const nameCountObj = { location };

          Object.keys(locationCounts[location]).forEach((name) => {
            nameCountObj[name] = locationCounts[location][name];
          });

          return nameCountObj;
        }
      );

      const nameScoreStats = {};
      for (const name in nameScores) {
        const scores = nameScores[name];
        const avgScore =
          scores.reduce((sum, { avg }) => sum + avg, 0) / scores.length;
        const minScore = Math.min(...scores.map(({ min }) => min));
        const maxScore = Math.max(...scores.map(({ max }) => max));
        nameScoreStats[name] = { avg: avgScore, min: minScore, max: maxScore };
      }

      const locationScoreStats = {};
      for (const location in locationScores) {
        const scores = locationScores[location];
        const avgScore =
          scores.reduce((sum, { avgScore }) => sum + avgScore, 0) /
          scores.length;
        const minScore = Math.min(...scores.map(({ minScore }) => minScore));
        const maxScore = Math.max(...scores.map(({ maxScore }) => maxScore));
        locationScoreStats[location] = { avgScore, minScore, maxScore };
      }

      const weekBeginningTimestamp = admin.firestore.Timestamp.fromDate(
        new Date(weekBeginningDate)
      );

      const aggregationDoc = {
        date: weekBeginningDate,
        species_count: speciesCountArr,
        location_species_count: locationSpeciesCountArr,
        species_score_stats: nameScoreStats,
        location_score_stats: locationScoreStats,
        shannon_index: shannonIndex,
        simpson_index: simpsonDiversityIndex,
        location_diversity_stats: locationDiversityStatsArr,
        timestamp: weekBeginningTimestamp,
      };

      const existingWeekDoc = await db
        .collection("weekly_aggregations")
        .doc(weekBeginningDate)
        .get();

      if (existingWeekDoc.exists) {
        console.log(
          `Week beginning ${weekBeginningDate} already exists, updating...`
        );
      } else {
        console.log(
          `Creating new weekly aggregation for week beginning ${weekBeginningDate}`
        );
      }

      await db
        .collection("weekly_aggregations")
        .doc(weekBeginningDate)
        .set(aggregationDoc);
    }

    console.log("Weekly aggregations backfill completed successfully");
  } catch (error) {
    console.error("Error during weekly aggregations backfill:", error);
  }
}

backfillWeeklyAggregations()
  .then(() => {
    console.log("Backfill process completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error during backfill:", err);
    process.exit(1);
  });
