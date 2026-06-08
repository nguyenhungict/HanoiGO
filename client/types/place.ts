export interface Place {
  id: string;
  name: string;
  category: string;
  district: string;
  address: string | null;
  lat: number;
  lng: number;
  imageUrl: string | null;
  tags: string[];
  alwaysOpen: boolean;
  openTimeStart?: string | Date;
  openTimeEnd?: string | Date;
  descriptionEn?: string | null;
  gallery?: Array<{ id: string; url: string }> | null;
  openDays?: number[] | null;
  visitDurationMin?: number | null;
  _count?: {
    tripStops: number;
  };
}

export const PLACE_CATEGORIES = [
  'Nature & Outdoors',
  'Arts & Culture',
  'Heritage & History',
  'Spiritual',
  'Sightseeing'
];
