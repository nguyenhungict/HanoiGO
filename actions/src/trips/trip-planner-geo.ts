import {
  AVG_SPEED_KMH,
  EARTH_RADIUS_KM,
  MAX_PLACES_PER_DAY,
} from './trip-planner.constants';
import { Place } from './trip-planner.types';

export function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
}

export function haversineFallbackMatrix(places: Place[]): number[][] {
  return places.map((a) =>
    places.map((b) => {
      const distKm = haversine(a.lat, a.lng, b.lat, b.lng);
      return (distKm / AVG_SPEED_KMH) * 3600;
    }),
  );
}

export function estimateTravelSec(from: Place, to: Place): number {
  const distKm = haversine(from.lat, from.lng, to.lat, to.lng);
  return (distKm / AVG_SPEED_KMH) * 3600;
}

export function getCentroid(places: Place[]) {
  if (places.length === 0) return { lat: 0, lng: 0 };
  const lat = places.reduce((s, p) => s + p.lat, 0) / places.length;
  const lng = places.reduce((s, p) => s + p.lng, 0) / places.length;
  return { lat, lng };
}

export function kMeansClustering(
  places: Place[],
  k: number,
  maxIter = 50,
): Place[][] {
  if (places.length <= k) return places.map((p) => [p]);

  // Deterministic random to ensure stable clustering results across identical requests
  let seed = places.reduce((sum, p) => sum + p.lat + p.lng, 0) * 10000;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // K-Means++ initialization — better geographic spread
  const centroids: { lat: number; lng: number }[] = [];
  const firstIdx = Math.floor(random() * places.length);
  centroids.push({ lat: places[firstIdx].lat, lng: places[firstIdx].lng });

  for (let c = 1; c < k; c++) {
    const distances = places.map((p) => {
      let minDist = Infinity;
      for (const centroid of centroids) {
        const d = haversine(p.lat, p.lng, centroid.lat, centroid.lng);
        if (d < minDist) minDist = d;
      }
      return minDist * minDist; // squared for probability weighting
    });
    const totalDist = distances.reduce((s, d) => s + d, 0);
    if (totalDist === 0) {
      centroids.push({ lat: places[c].lat, lng: places[c].lng });
      continue;
    }
    let r = random() * totalDist;
    let selectedIdx = 0;
    for (let i = 0; i < distances.length; i++) {
      r -= distances[i];
      if (r <= 0) {
        selectedIdx = i;
        break;
      }
    }
    centroids.push({
      lat: places[selectedIdx].lat,
      lng: places[selectedIdx].lng,
    });
  }

  let clusters: Place[][] = [];

  for (let iter = 0; iter < maxIter; iter++) {
    clusters = Array.from({ length: k }, () => [] as Place[]);
    for (const place of places) {
      let minDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < k; c++) {
        const dist = haversine(
          place.lat,
          place.lng,
          centroids[c].lat,
          centroids[c].lng,
        );
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }
      clusters[bestCluster].push(place);
    }

    let converged = true;
    for (let c = 0; c < k; c++) {
      if (clusters[c].length === 0) continue;
      const newLat =
        clusters[c].reduce((s, p) => s + p.lat, 0) / clusters[c].length;
      const newLng =
        clusters[c].reduce((s, p) => s + p.lng, 0) / clusters[c].length;
      if (
        Math.abs(newLat - centroids[c].lat) > 0.0001 ||
        Math.abs(newLng - centroids[c].lng) > 0.0001
      ) {
        converged = false;
      }
      centroids[c] = { lat: newLat, lng: newLng };
    }
    if (converged) break;
  }

  clusters = clusters.filter((c) => c.length > 0);

  // Rebalance
  for (const cluster of clusters) {
    while (cluster.length > MAX_PLACES_PER_DAY) {
      let lightestIdx = -1;
      let lightestSize = Infinity;
      for (let c = 0; c < clusters.length; c++) {
        if (clusters[c] === cluster) continue;
        if (clusters[c].length < lightestSize) {
          lightestSize = clusters[c].length;
          lightestIdx = c;
        }
      }
      if (lightestIdx === -1) break;

      // Find place in full cluster closest to the lightest cluster
      let bestPlaceIdx = -1;
      let minDistToLightest = Infinity;
      const targetCentroid = getCentroid(clusters[lightestIdx]);

      for (let i = 0; i < cluster.length; i++) {
        const d = haversine(
          cluster[i].lat,
          cluster[i].lng,
          targetCentroid.lat,
          targetCentroid.lng,
        );
        if (d < minDistToLightest) {
          minDistToLightest = d;
          bestPlaceIdx = i;
        }
      }

      if (bestPlaceIdx !== -1) {
        const [movedPlace] = cluster.splice(bestPlaceIdx, 1);
        clusters[lightestIdx].push(movedPlace);
      } else {
        break;
      }
    }
  }

  return clusters;
}
