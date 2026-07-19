'use server';

import { api, resolveImageUrl } from './config';

export interface NearbyPlace {
  id: string;
  name: string;
  category: string;
  district: string | null;
  address: string | null;
  lat: number;
  lng: number;
  image: string | null;
  distanceMeters: number;
}

/**
 * Resolves places near a point using the backend PostGIS proximity query
 * (ST_DWithin). Distances come from the database, not from the browser.
 */
export async function getNearbyPlacesAction(
  lat: number,
  lng: number,
  radius = 5000,
  limit = 20,
) {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      radius: String(radius),
      limit: String(limit),
    });

    const response = await api.get(`/places/nearby?${params.toString()}`);
    const places: NearbyPlace[] = (response.data?.places ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category ?? 'Sightseeing',
      district: p.district ?? null,
      address: p.address ?? null,
      lat: p.lat,
      lng: p.lng,
      image: resolveImageUrl(p.imageUrl),
      distanceMeters: p.distanceMeters,
    }));

    return {
      success: true as const,
      data: places,
      radiusMeters: response.data?.radiusMeters ?? radius,
    };
  } catch (error: any) {
    return {
      error:
        error.response?.data?.message ||
        'Không thể tìm các địa điểm gần bạn',
    };
  }
}
