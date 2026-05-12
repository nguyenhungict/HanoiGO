export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
  createdAt: string;
  _count: {
    trips: number;
  };
}

export interface UserDetail extends User {
  bio: string | null;
  nationality: string | null;
  languages: string[];
  _count: {
    trips: number;
    reportsCreated: number;
    reportsAgainst: number;
  };
}
