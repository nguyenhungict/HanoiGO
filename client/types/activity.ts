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
  
  // Trip sharing fields
  tripId?: string;
  likesCount?: number;
  commentsCount?: number;
  savesCount?: number;
  isLiked?: boolean;
  trip?: any; // Will use any for now to avoid circular dependency or complex type imports, can refine later
}

export interface ActivityMember {
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  status: string;
  joinedAt: string;
}
