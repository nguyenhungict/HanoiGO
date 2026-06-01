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

/**
 * Compute the mean intra-cluster travel distance for a set of places.
 * Used to measure how geographically tight a cluster is.
 */
function clusterSpreadKm(places: Place[]): number {
  if (places.length <= 1) return 0;
  const centroid = getCentroid(places);
  return (
    places.reduce(
      (sum, p) => sum + haversine(p.lat, p.lng, centroid.lat, centroid.lng),
      0,
    ) / places.length
  );
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

  // ── Rebalance: move overflow places to the GEOGRAPHICALLY CLOSEST eligible cluster ──
  // Two-pass approach:
  //  Pass 1 (soft): Move places respecting a distance guard so we don't mix
  //    geographically distant places unless necessary.
  //  Pass 2 (forced): If any cluster is STILL over MAX_PLACES_PER_DAY after
  //    soft moves, force-move the place that is closest to the target cluster,
  //    regardless of distance — capacity constraints are non-negotiable.
  for (let pass = 0; pass < 2; pass++) {
    const forcedMove = pass === 1;
    let rebalanced = true;
    while (rebalanced) {
      rebalanced = false;
      for (let c = 0; c < clusters.length; c++) {
        while (clusters[c].length > MAX_PLACES_PER_DAY) {
          // Rank all places by distance from this cluster's centroid (furthest first).
          // In soft mode we try the furthest-from-centroid first (worst fit).
          // In forced mode we try ALL candidates and pick the one closest to a target.
          const clusterCentroid = getCentroid(clusters[c]);
          const candidates = clusters[c]
            .map((place, idx) => ({
              place,
              idx,
              distFromCentroid: haversine(
                place.lat,
                place.lng,
                clusterCentroid.lat,
                clusterCentroid.lng,
              ),
            }))
            .sort((a, b) => b.distFromCentroid - a.distFromCentroid);

          let moved = false;

          for (const candidate of candidates) {
            // Find the target cluster closest to this candidate that has room
            let bestTargetIdx = -1;
            let minDistToTarget = Infinity;

            for (let t = 0; t < clusters.length; t++) {
              if (t === c) continue;
              if (clusters[t].length >= MAX_PLACES_PER_DAY) continue;

              const targetCentroid = getCentroid(clusters[t]);
              const dist = haversine(
                candidate.place.lat,
                candidate.place.lng,
                targetCentroid.lat,
                targetCentroid.lng,
              );

              if (dist < minDistToTarget) {
                minDistToTarget = dist;
                bestTargetIdx = t;
              }
            }

            if (bestTargetIdx === -1) break; // all targets full

            if (!forcedMove) {
              // Soft pass: check distance guard
              const targetSpread = clusterSpreadKm(clusters[bestTargetIdx]);
              const maxAllowedDist = Math.max(targetSpread * 3, 5);
              if (
                minDistToTarget > maxAllowedDist &&
                clusters[bestTargetIdx].length > 0
              ) {
                continue; // try next candidate instead of breaking
              }
            }

            // Move the place
            const actualIdx = clusters[c].indexOf(candidate.place);
            clusters[c].splice(actualIdx, 1);
            clusters[bestTargetIdx].push(candidate.place);
            moved = true;
            rebalanced = true;
            break; // restart the while loop with updated cluster sizes
          }

          if (!moved) break; // no candidate could be moved — exit inner while
        }
      }
    }
  }

  return clusters;
}
