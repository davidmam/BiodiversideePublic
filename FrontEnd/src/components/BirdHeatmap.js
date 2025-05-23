import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useMemo } from "react";

const BirdHeatmap = ({ markers, radius = 30, opacity = 0.7 }) => {
  const map = useMap();
  const visualization = useMapsLibrary("visualization");

  const heatmap = useMemo(() => {
    if (!visualization) return null;

    return new google.maps.visualization.HeatmapLayer({
      radius,
      opacity,
    });
  }, [visualization, radius, opacity]);

  useEffect(() => {
    if (!heatmap || !map) return;

    const heatmapData = markers.map((marker) => ({
      location: new google.maps.LatLng(marker.latLng),
      weight: marker.count,
    }));

    heatmap.setData(heatmapData);
  }, [heatmap, markers]);

  useEffect(() => {
    if (!heatmap) return;

    heatmap.setMap(map);
    return () => {
      heatmap.setMap(null);
    };
  }, [heatmap, map]);

  return null;
};

export default BirdHeatmap;
