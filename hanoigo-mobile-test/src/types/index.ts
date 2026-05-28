export interface Place {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  category: string;
  district: string;
  imageUrl?: string | null;
}

export interface GpsData {
  lat: number;
  lng: number;
  accuracy: number;
  place: string;
}

export interface User {
  username?: string;
  email?: string;
  access_token?: string;
}

export type NetworkStatus = 'idle' | 'loading' | 'success' | 'error';
export type GpsStatus = 'idle' | 'loading' | 'success';
export type AuthMode = 'login' | 'register';
