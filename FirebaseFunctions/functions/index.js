const functions = require("firebase-functions/v2");
const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/scheduler");
const { log } = require("firebase-functions/logger");

admin.initializeApp();

const db = admin.firestore();

exports.aggregateBirdDetections = onSchedule("0 * * * *", async () => { /** aggregates hourly detections the hard way. replace with SQL call in postgres. */
  const currentDate = new Date();
  const previousDate = new Date(currentDate);
  previousDate.setHours(previousDate.getHours() - 1);

  const formattedDate = previousDate /** set string format for the date and hour */
    .toISOString()
    .replace(/T/, "-")
    .split(":")[0];

  const detectionsSnapshot = await db
    .collection("bird_detections")
    .where("timestamp", ">=", previousDate)
    .where("timestamp", "<", currentDate)
    .get();

  const nameScores = {}; /** global dictionary of species scores in the last hour */
  const locationScores = {}; /** all scores per  location */
  const locationNameCountMap = {};  /** species count per location */
  const nameCountArr = []; /** total count per location */
  const locationScoreStatsArr = []; /** indexing by species rather than as a list of objects */

  const birdSpeciesCountMap = {}; /** counts by bird species */

  if (!detectionsSnapshot.empty) {
    detectionsSnapshot.forEach((doc) => {
      const detection = doc.data();
      const { name, id: location, score } = detection;

      let nameEntry = nameCountArr.find((entry) => entry.name === name);
      if (nameEntry) {
        nameEntry.count += 1;
      } else {
        nameCountArr.push({ name, count: 1 });
      }

      if (!birdSpeciesCountMap[name]) {
        birdSpeciesCountMap[name] = 1;
      } else {
        birdSpeciesCountMap[name] += 1;
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
  }

  const locationNameCountArr = Object.keys(locationNameCountMap).map(
    (location) => {
      const nameCountObj = { location };

      Object.keys(locationNameCountMap[location]).forEach((name) => {
        nameCountObj[name] = locationNameCountMap[location][name];
      });

      return nameCountObj;
    }
  );

  const nameScoreStatsArr = []; /** global stats array by species */
  for (const name in nameScores) {
    const scores = nameScores[name];
    const avgScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    nameScoreStatsArr.push({
      name,
      avg: avgScore,
      min: minScore,
      max: maxScore,
    });
  }

  for (const location in locationScores) { /** summary stats on scores by location */
    const scores = locationScores[location];
    const avgScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    locationScoreStatsArr.push({
      location,
      avgScore,
      minScore,
      maxScore,
    });
  }

  const locationDiversityStatsArr = Object.entries(locationNameCountMap).map( /** calcualtes diversity index */
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
  /** end of stats calculation */

  const aggregationDoc = { /** create doc to return */
    date: formattedDate,
    species_count: nameCountArr,
    location_species_count: locationNameCountArr,
    species_score_stats: nameScoreStatsArr,
    location_score_stats: locationScoreStatsArr,
    shannon_index: shannonIndex,
    simpson_index: 1 - simpsonIndex,
    location_diversity_stats: locationDiversityStatsArr,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };
  /** sort the all time stats. This is doing heavy lifting that is better done with SQL. */
  await db
    .collection("hourly_aggregations")
    .doc(formattedDate)
    .set(aggregationDoc);

  console.log("Aggregated bird detections for", formattedDate);

  if (Object.keys(birdSpeciesCountMap).length > 0) {
    const allTimeAggregationRef = db
      .collection("all-time-aggregation")
      .doc("global");

    await db.runTransaction(async (transaction) => {
      const allTimeDoc = await transaction.get(allTimeAggregationRef);
      let currentAggregation = allTimeDoc.exists
        ? allTimeDoc.data()
        : {
            species_count: [],
            location_species_count: [],
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          };

      nameCountArr.forEach((newEntry) => {
        const existingEntryIndex = currentAggregation.species_count.findIndex(
          (entry) => entry.name === newEntry.name
        );

        if (existingEntryIndex >= 0) {
          currentAggregation.species_count[existingEntryIndex].count +=
            newEntry.count;
        } else {
          currentAggregation.species_count.push({ ...newEntry });
        }
      });

      locationNameCountArr.forEach((newLocationEntry) => {
        const location = newLocationEntry.location;
        const existingLocationIndex =
          currentAggregation.location_species_count.findIndex(
            (entry) => entry.location === location
          );

        if (existingLocationIndex >= 0) {
          const existingLocationEntry =
            currentAggregation.location_species_count[existingLocationIndex];

          Object.keys(newLocationEntry).forEach((key) => {
            if (key !== "location") {
              if (existingLocationEntry[key]) {
                existingLocationEntry[key] += newLocationEntry[key];
              } else {
                existingLocationEntry[key] = newLocationEntry[key];
              }
            }
          });
        } else {
          currentAggregation.location_species_count.push({
            ...newLocationEntry,
          });
        }
      });

      currentAggregation.timestamp =
        admin.firestore.FieldValue.serverTimestamp();

      transaction.set(allTimeAggregationRef, currentAggregation);
    });

    console.log("Updated all-time aggregation with new detection data");
  } /* end aggreagate update */
});


exports.aggregateDailyBirdDetections = onSchedule("0 0 * * *", async () => { /** daily data calculations */
  const currentDate = new Date();
  const previousDate = new Date(currentDate);
  previousDate.setDate(previousDate.getDate() - 1);

  const formattedDate = previousDate.toISOString().split("T")[0];

  const hourlyAggregationsSnapshot = await db
    .collection("hourly_aggregations")
    .where("timestamp", ">=", previousDate)
    .where("timestamp", "<", currentDate)
    .get();

  const nameCounts = {};
  const locationCounts = {};
  const nameScores = {};
  const locationScores = {};

  if (!hourlyAggregationsSnapshot.empty) {
    hourlyAggregationsSnapshot.forEach((doc) => {
      const aggregation = doc.data();
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

      species_score_stats.forEach(({ name, avg, min, max }) => {
        if (nameScores[name]) {
          nameScores[name].push({ avg, min, max });
        } else {
          nameScores[name] = [{ avg, min, max }];
        }
      });

      location_score_stats.forEach(
        ({ location, avgScore, minScore, maxScore }) => {
          if (locationScores[location]) {
            locationScores[location].push({ avgScore, minScore, maxScore });
          } else {
            locationScores[location] = [{ avgScore, minScore, maxScore }];
          }
        }
      );
    });
  }

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
      scores.reduce((sum, { avgScore }) => sum + avgScore, 0) / scores.length;
    const minScore = Math.min(...scores.map(({ minScore }) => minScore));
    const maxScore = Math.max(...scores.map(({ maxScore }) => maxScore));
    locationScoreStats[location] = { avgScore, minScore, maxScore };
  }

  const aggregationDoc = {
    date: formattedDate,
    species_count: speciesCountArr,
    location_species_count: locationSpeciesCountArr,
    species_score_stats: nameScoreStats,
    location_score_stats: locationScoreStats,
    shannon_index: shannonIndex,
    simpson_index: simpsonDiversityIndex,
    location_diversity_stats: locationDiversityStatsArr,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db
    .collection("daily_aggregations")
    .doc(formattedDate)
    .set(aggregationDoc);

  console.log("Aggregated bird detections for", formattedDate);
});

exports.aggregateWeeklyBirdDetections = onSchedule("0 0 * * 0", async () => {
  const currentDate = new Date();

  const mondayOfWeek = new Date(currentDate);
  mondayOfWeek.setDate(currentDate.getDate() - 6);

  const weekBeginningDate = mondayOfWeek.toISOString().split("T")[0];

  const weekBeginningTimestamp =
    admin.firestore.Timestamp.fromDate(mondayOfWeek);

  const dailyAggregationsSnapshot = await db
    .collection("daily_aggregations")
    .where("timestamp", ">=", mondayOfWeek)
    .where("timestamp", "<", currentDate)
    .get();

  const nameCounts = {};
  const locationCounts = {};
  const nameScores = {};
  const locationScores = {};

  if (!dailyAggregationsSnapshot.empty) {
    dailyAggregationsSnapshot.forEach((doc) => {
      const aggregation = doc.data();
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
        const { avgScore, minScore, maxScore } = location_score_stats[location];

        if (locationScores[location]) {
          locationScores[location].push({ avgScore, minScore, maxScore });
        } else {
          locationScores[location] = [{ avgScore, minScore, maxScore }];
        }
      });
    });
  }

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
      scores.reduce((sum, { avgScore }) => sum + avgScore, 0) / scores.length;
    const minScore = Math.min(...scores.map(({ minScore }) => minScore));
    const maxScore = Math.max(...scores.map(({ maxScore }) => maxScore));
    locationScoreStats[location] = { avgScore, minScore, maxScore };
  }

  const aggregationDoc = { /** document summary */
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

  await db
    .collection("weekly_aggregations") /* Collection weekly_aggregations */
    .doc(weekBeginningDate)
    .set(aggregationDoc);

  console.log(
    "Aggregated bird detections for the week beginning",
    weekBeginningDate
  );
});

exports.aggregateMonthlyBirdDetections = onSchedule("0 0 1 * *", async () => {
  const currentDate = new Date();
  const firstDayOfCurrentMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const firstDayOfPreviousMonth = new Date(firstDayOfCurrentMonth);
  firstDayOfPreviousMonth.setMonth(firstDayOfPreviousMonth.getMonth() - 1);

  const startTimestamp = admin.firestore.Timestamp.fromDate(
    firstDayOfPreviousMonth
  );
  const endTimestamp = admin.firestore.Timestamp.fromDate(
    firstDayOfCurrentMonth
  );
  const monthPeriod = firstDayOfPreviousMonth.toISOString().slice(0, 7);

  const dailyAggregationsSnapshot = await db
    .collection("daily_aggregations")
    .where("timestamp", ">=", firstDayOfPreviousMonth)
    .where("timestamp", "<", firstDayOfCurrentMonth)
    .get();

  const nameCounts = {};
  const locationCounts = {};
  const nameScores = {};
  const locationScores = {};

  if (!dailyAggregationsSnapshot.empty) {
    dailyAggregationsSnapshot.forEach((doc) => {
      const aggregation = doc.data();
      const {
        species_count,
        location_species_count,
        species_score_stats,
        location_score_stats,
      } = aggregation;

      species_count.forEach(({ name, count }) => {
        nameCounts[name] = (nameCounts[name] || 0) + count;
      });

      location_species_count.forEach(({ location, ...nameCounts }) => {
        if (!locationCounts[location]) {
          locationCounts[location] = {};
        }
        Object.entries(nameCounts).forEach(([name, count]) => {
          locationCounts[location][name] =
            (locationCounts[location][name] || 0) + count;
        });
      });

      Object.entries(species_score_stats).forEach(
        ([name, { avg, min, max }]) => {
          if (!nameScores[name]) {
            nameScores[name] = [];
          }
          nameScores[name].push({ avg, min, max });
        }
      );

      Object.entries(location_score_stats).forEach(
        ([location, { avgScore, minScore, maxScore }]) => {
          if (!locationScores[location]) {
            locationScores[location] = [];
          }
          locationScores[location].push({ avgScore, minScore, maxScore });
        }
      );
    });
  }

  const speciesCountArr = Object.entries(nameCounts).map(([name, count]) => ({
    name,
    count,
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

  const locationSpeciesCountArr = Object.entries(locationCounts).map(
    ([location, speciesMap]) => ({
      location,
      ...speciesMap,
    })
  );

  const nameScoreStats = {};
  for (const name in nameScores) {
    const scores = nameScores[name];
    nameScoreStats[name] = {
      avg: scores.reduce((sum, s) => sum + s.avg, 0) / scores.length,
      min: Math.min(...scores.map((s) => s.min)),
      max: Math.max(...scores.map((s) => s.max)),
    };
  }

  const locationScoreStats = {};
  for (const location in locationScores) {
    const scores = locationScores[location];
    locationScoreStats[location] = {
      avgScore: scores.reduce((sum, s) => sum + s.avgScore, 0) / scores.length,
      minScore: Math.min(...scores.map((s) => s.minScore)),
      maxScore: Math.max(...scores.map((s) => s.maxScore)),
    };
  }

  const aggregationDoc = {
    month: monthPeriod,
    species_count: speciesCountArr,
    location_species_count: locationSpeciesCountArr,
    species_score_stats: nameScoreStats,
    location_score_stats: locationScoreStats,
    shannon_index: shannonIndex,
    simpson_index: simpsonDiversityIndex,
    location_diversity_stats: locationDiversityStatsArr,
    timestamp: startTimestamp,
  };

  await db
    .collection("monthly_aggregations")
    .doc(monthPeriod)
    .set(aggregationDoc);

  console.log("Aggregated bird detections for the month:", monthPeriod);
});

exports.pingKeepAlive = onSchedule("every 15 minutes", async () => {
  const url = "https://biodiversidee-b5654.ew.r.appspot.com/keep-alive";

  try {
    const response = await fetch(url);
    if (response.ok) {
      log("Keep-alive ping successful.");
      console.log("Keep-alive ping successful.");
    } else {
      log(
        "Failed to ping keep-alive URL:",
        response.status,
        response.statusText
      );
      console.error(
        "Failed to ping keep-alive URL:",
        response.status,
        response.statusText
      );
    }
  } catch (error) {
    log("Error pinging keep-alive URL:", error);
    console.error("Error pinging keep-alive URL:", error);
  }
});

exports.deleteOldDetections = onSchedule("every 24 hours", async () => {
  const currentDate = new Date();
  const oldestDate = new Date(currentDate);
  oldestDate.setDate(oldestDate.getDate() - 7);

  const oldestDateTimestamp = admin.firestore.Timestamp.fromDate(oldestDate);

  const querySnapshot = await db
    .collection("bird_detections")
    .where("timestamp", "<", oldestDateTimestamp)
    .limit(2000)
    .get();

  log("Found", querySnapshot.size, "old detections to delete.");
  console.log("Found", querySnapshot.size, "old detections to delete.");

  const batch = db.batch();
  querySnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  log("Deleting old detections...");
  console.log("Deleting old detections...");

  await batch.commit();

  log("Old detections deleted successfully.");
  console.log("Old detections deleted successfully.");
});
