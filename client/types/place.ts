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
  _count?: {
    tripStops: number;
  };
}

export const PLACE_CATEGORIES = [
  'Nature & Outdoors',
  'Arts & Culture',
  'Heritage & History',
  'Spiritual',
  'Eat & Shop',
  'Sightseeing'
];
