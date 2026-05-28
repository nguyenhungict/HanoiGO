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
  // BUG FIX: Previously moved to the "lightest" cluster (fewest places), which caused
  // geographically distant places (e.g., Bat Trang in Gia Lam + Cau The Huc in Hoan Kiem)
  // to land in the same day. Now we always move to the cluster whose centroid is
  // closest to the place being moved, as long as that cluster is under MAX_PLACES_PER_DAY.
  let rebalanced = true;
  while (rebalanced) {
    rebalanced = false;
    for (let c = 0; c < clusters.length; c++) {
      while (clusters[c].length > MAX_PLACES_PER_DAY) {
        // Find the place in this over-full cluster that is FURTHEST from its centroid
        // (i.e., the place that fits the least in this cluster)
        const clusterCentroid = getCentroid(clusters[c]);
        let worstPlaceIdx = -1;
        let maxDistFromCentroid = -1;

        for (let i = 0; i < clusters[c].length; i++) {
          const d = haversine(
            clusters[c][i].lat,
            clusters[c][i].lng,
            clusterCentroid.lat,
            clusterCentroid.lng,
          );
          if (d > maxDistFromCentroid) {
            maxDistFromCentroid = d;
            worstPlaceIdx = i;
          }
        }

        if (worstPlaceIdx === -1) break;
        const worstPlace = clusters[c][worstPlaceIdx];

        // Find the cluster that is geographically CLOSEST to worstPlace,
        // excluding the current cluster, and only if under capacity.
        let bestTargetIdx = -1;
        let minDistToTarget = Infinity;

        for (let t = 0; t < clusters.length; t++) {
          if (t === c) continue;
          if (clusters[t].length >= MAX_PLACES_PER_DAY) continue;

          // Score: distance from worstPlace to target cluster centroid
          const targetCentroid = getCentroid(clusters[t]);
          const dist = haversine(
            worstPlace.lat,
            worstPlace.lng,
            targetCentroid.lat,
            targetCentroid.lng,
          );

          if (dist < minDistToTarget) {
            minDistToTarget = dist;
            bestTargetIdx = t;
          }
        }

        // If no eligible target exists (all other clusters are full), stop rebalancing
        if (bestTargetIdx === -1) break;

        // Validate: moving this place should not dramatically worsen the target cluster's spread.
        // If worstPlace is too far from the best target, try to find ANY place in this cluster
        // that is close enough to move — not just the furthest one.
        const targetSpread = clusterSpreadKm(clusters[bestTargetIdx]);
        const maxAllowedDist = Math.max(targetSpread * 3, 5); // at least 5km tolerance
        if (minDistToTarget > maxAllowedDist && clusters[bestTargetIdx].length > 0) {
          // worstPlace is too far — search for the place closest to the target instead
          const targetCentroid = getCentroid(clusters[bestTargetIdx]);
          let closestIdx = -1;
          let closestDist = Infinity;
          for (let i = 0; i < clusters[c].length; i++) {
            const d = haversine(
              clusters[c][i].lat,
              clusters[c][i].lng,
              targetCentroid.lat,
              targetCentroid.lng,
            );
            if (d < closestDist && d <= maxAllowedDist) {
              closestDist = d;
              closestIdx = i;
            }
          }
          if (closestIdx === -1) break; // no place in this cluster fits any target
          clusters[bestTargetIdx].push(clusters[c].splice(closestIdx, 1)[0]);
          rebalanced = true;
          continue;
        }

        clusters[c].splice(worstPlaceIdx, 1);
        clusters[bestTargetIdx].push(worstPlace);
        rebalanced = true;
      }
    }
  }

  return clusters;
}
