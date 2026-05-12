export interface Activity {
  id: string;
  title: string;
  description: string | null;
  category: string;
  imageUrl: string | null;
  hostId: string;
  hostName: string | null;
  hostAvatar: string | null;
  hostNationality: string | null;
  scheduledAt: string;
  createdAt: string;
  lat: number;
  lng: number;
  address: string | null;
  memberCount: number;
  maxMembers: number;
  myStatus?: 'APPROVED' | 'PENDING' | 'NONE';
}

export interface ActivityMember {
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  status: string;
  joinedAt: string;
}
