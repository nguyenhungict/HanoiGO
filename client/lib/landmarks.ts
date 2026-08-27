import { resolveImageUrl } from './actions/config';

export interface Landmark {
  id: string;
  name: string;
  image: string;
  gallery?: string[];
  rating: number;
  category: string;
  description: string;
  lat: number;
  lng: number;
  district?: string;
  alwaysOpen?: boolean;
  openDays?: number[];
  openTimeStart?: string | null;
  openTimeEnd?: string | null;
}

export type PlaceStory = {
  eyebrow: string;
  intro: string;
  archiveNote: string;
  sections: { title: string; body: string }[];
  facts: { label: string; value: string }[];
};

// Default static data for fallback
export const staticLandmarks: Landmark[] = [];

const CLIENT_CACHE_KEY = 'hanoigo_landmarks_v2';
const CLIENT_CACHE_TTL = 60 * 1000; // 1 minute cache

// API fetch function
export async function fetchLandmarks(): Promise<Landmark[]> {
  // Client-side: return from sessionStorage if fresh (avoids refetch on navigation)
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(CLIENT_CACHE_KEY);
      if (raw) {
        const { data, ts } = JSON.parse(raw) as { data: Landmark[]; ts: number };
        if (Date.now() - ts < CLIENT_CACHE_TTL) return data;
      }
    } catch { /* ignore parse errors */ }
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888';
    const response = await fetch(`${baseUrl}/places`, {
      cache: 'no-store',
    });
    
    if (!response.ok) throw new Error('Failed to fetch from API');
    const responseData = await response.json();
    const data = Array.isArray(responseData) ? responseData : (responseData.places || []);
    
    // Highly reliable Unsplash static placeholders
    const PLACEHOLDERS: Record<string, string> = {
      'Museum':           "https://images.unsplash.com/photo-1599708153386-62bf3f03361a?w=800&q=80",
      'Historic Site':    "https://images.unsplash.com/photo-1599708153386-62bf3f03361a?w=800&q=80",
      'Temple & Pagoda':  "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&q=80",
      'Nature & Lake':    "https://images.unsplash.com/photo-1559592442-741e6b89cc46?w=800&q=80",
      'Arts & Performance': "https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=800&q=80",
      'Street & Market':  "https://images.unsplash.com/photo-1555921015-5532091f6026?w=800&q=80",
    };
    const getPlaceholder = (category: string) =>
      PLACEHOLDERS[category] ?? "https://images.unsplash.com/photo-1509030450996-93f25ef2030f?w=800&q=80";

    const landmarks = data.map((p: any) => {
      const category = p.category || 'Sightseeing';
      const placeholder = getPlaceholder(category);

      // Defensive check: if imageUrl exists but is a broken/deprecated link, use placeholder
      const isValidImage = p.imageUrl && !p.imageUrl.includes('source.unsplash.com');

      return {
        id: p.id,
        name: p.name,
        image: isValidImage ? (resolveImageUrl(p.imageUrl) || placeholder) : placeholder,
        gallery: (p.gallery && p.gallery.length > 0)
          ? p.gallery
              .map((img: any) => resolveImageUrl(img.url) || placeholder)
              .filter((url: string) => !url.includes('source.unsplash.com'))
          : [placeholder],
        rating: 4.5,
        category: category,
        description: p.descriptionEn || "",
        lat: p.lat,
        lng: p.lng,
        district: p.district || 'Hoan Kiem',
        alwaysOpen: p.alwaysOpen ?? false,
        openDays: p.openDays ?? [0, 1, 2, 3, 4, 5, 6],
        openTimeStart: p.openTimeStart || null,
        openTimeEnd: p.openTimeEnd || null,
      };
    });

    // Persist to sessionStorage so subsequent navigations skip the fetch
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(CLIENT_CACHE_KEY, JSON.stringify({ data: landmarks, ts: Date.now() }));
      } catch { /* ignore quota errors */ }
    }

    return landmarks;
  } catch (error: any) {
    if (error?.digest === 'DYNAMIC_SERVER_USAGE' || error?.message?.includes('DYNAMIC_SERVER_USAGE')) {
      throw error;
    }
    console.error("API Error, falling back to static landmarks:", error);
    return staticLandmarks;
  }
}

export let landmarks = staticLandmarks;

function cleanDescription(description: string, name: string, category: string) {
  const normalized = description.replace(/â€¦/g, '...').trim();
  if (normalized) return normalized;

  return `${name} is one of Hanoi's most memorable ${category.toLowerCase()} destinations, carrying a strong sense of place and a distinct local rhythm.`;
}

const CATEGORY_LENS: Record<string, { eyebrow: string; mood: string; focus: string }> = {
  'Museum': {
    eyebrow: 'Museum',
    mood: 'quiet observation, layered exhibits, and concentrated history',
    focus: 'artifacts, collections, and the stories preserved behind glass',
  },
  'Temple & Pagoda': {
    eyebrow: 'Sacred Layer',
    mood: 'ritual calm, incense, and a slower ceremonial tempo',
    focus: 'symbolic details, courtyards, altars, and contemplative spaces',
  },
  'Historic Site': {
    eyebrow: 'Historic Trace',
    mood: 'monumental form, visible age, and strong urban symbolism',
    focus: 'architectural silhouettes, historical turning points, and urban heritage',
  },
  'Nature & Lake': {
    eyebrow: 'Open Air Frame',
    mood: 'breathing room, horizon lines, and a softer city cadence',
    focus: 'landscape atmosphere, movement, and the contrast with the dense urban fabric',
  },
  'Arts & Performance': {
    eyebrow: 'Arts & Performance',
    mood: 'creative expression, live staging, and layered cultural timelines',
    focus: 'galleries, performance spaces, and the artistic pulse of Hanoi',
  },
  'Street & Market': {
    eyebrow: 'Local Pulse',
    mood: 'commerce, conversation, and the dense choreography of daily life',
    focus: 'street textures, craft traditions, and the social energy of markets',
  },
};

function getCategoryLens(category: string) {
  return CATEGORY_LENS[category] ?? {
    eyebrow: 'City Archive',
    mood: 'local character, spatial memory, and a strong sense of urban texture',
    focus: "what the site reveals about Hanoi's identity when you slow down and read the place closely",
  };
}

export function getLandmarkById(id?: string | null) {
  if (!id) return null;
  return landmarks.find((landmark) => landmark.id === id) || null;
}

export function getPlaceStory(landmark: Landmark): PlaceStory {
  const lens = getCategoryLens(landmark.category);
  const baseDescription = cleanDescription(
    landmark.description,
    landmark.name,
    landmark.category,
  );

  return {
    eyebrow: lens.eyebrow,
    intro: `${landmark.name} reads as a ${landmark.category.toLowerCase()} stop with ${lens.mood}.`,
    archiveNote: `From the discovery map, ${landmark.name} should feel less like a pin and more like a chapter: a place where route, memory, and atmosphere overlap.`,
    sections: [
      {
        title: 'About This Place',
        body: baseDescription,
      },
    ],
    facts: [
      {
        label: 'Category',
        value: landmark.category,
      },
      {
        label: 'Visitor Score',
        value: landmark.rating.toFixed(1),
      },
      {
        label: 'District',
        value: landmark.district || 'Hoan Kiem',
      },
    ],
  };
}

export function formatTime(timeStr?: string | null): string {
  if (!timeStr) return '';
  if (timeStr.includes(':') && timeStr.length === 5) return timeStr; // already HH:MM
  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) {
      const match = timeStr.match(/(\d{2}):(\d{2})/);
      if (match) return `${match[1]}:${match[2]}`;
      return '';
    }
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '';
  }
}

export function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  
  const simpleMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (simpleMatch) {
    return parseInt(simpleMatch[1], 10) * 60 + parseInt(simpleMatch[2], 10);
  }
  
  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) {
      const match = timeStr.match(/(\d{2}):(\d{2})/);
      if (match) {
        return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
      }
      return null;
    }
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  } catch {
    return null;
  }
}

export function formatOpenDays(openDays?: number[]): string {
  if (!openDays || openDays.length === 0) return 'Closed weekly';
  if (openDays.length === 7) return 'Mon - Sun';
  
  // Sort days: Monday (1) to Saturday (6), Sunday (0 -> 7)
  const sortedDays = [...openDays].map(d => d === 0 ? 7 : d).sort((a, b) => a - b);
  
  let isConsecutive = true;
  for (let i = 1; i < sortedDays.length; i++) {
    if (sortedDays[i] !== sortedDays[i - 1] + 1) {
      isConsecutive = false;
      break;
    }
  }
  
  const dayLabels: Record<number, string> = {
    1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun'
  };
  
  if (isConsecutive && sortedDays.length > 1) {
    return `${dayLabels[sortedDays[0]]} - ${dayLabels[sortedDays[sortedDays.length - 1]]}`;
  }
  
  return sortedDays.map(d => dayLabels[d]).join(', ');
}

export interface OpeningStatus {
  isOpen: boolean;
  text: string;
  colorClass: string;
  dotColorClass: string;
}

export function getOpeningStatus(landmark: Landmark): OpeningStatus {
  if (landmark.alwaysOpen) {
    return {
      isOpen: true,
      text: 'Open 24/7',
      colorClass: 'text-emerald-600 bg-emerald-50/50 border-emerald-100/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
      dotColorClass: 'bg-emerald-500 animate-pulse',
    };
  }

  if (!landmark.openTimeStart || !landmark.openTimeEnd) {
    return {
      isOpen: false,
      text: 'No hours info',
      colorClass: 'text-outline/60 bg-surface-container-low border-outline/10',
      dotColorClass: 'bg-outline/40',
    };
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ...
  
  const openDays = landmark.openDays ?? [0, 1, 2, 3, 4, 5, 6];
  if (!openDays.includes(currentDay)) {
    return {
      isOpen: false,
      text: 'Closed now • Closed today',
      colorClass: 'text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
      dotColorClass: 'bg-rose-500',
    };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTimeToMinutes(landmark.openTimeStart);
  const endMinutes = parseTimeToMinutes(landmark.openTimeEnd);

  if (startMinutes === null || endMinutes === null) {
    return {
      isOpen: false,
      text: 'No hours info',
      colorClass: 'text-outline/60 bg-surface-container-low border-outline/10',
      dotColorClass: 'bg-outline/40',
    };
  }

  const startStr = formatTime(landmark.openTimeStart);
  const endStr = formatTime(landmark.openTimeEnd);

  // Handle overnight opening hours (e.g. 18:00 - 02:00)
  let isOpen = false;
  if (startMinutes < endMinutes) {
    isOpen = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    // Overnight case
    isOpen = currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  if (isOpen) {
    return {
      isOpen: true,
      text: `Open now • Closes at ${endStr}`,
      colorClass: 'text-emerald-600 bg-emerald-50/50 border-emerald-100/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
      dotColorClass: 'bg-emerald-500 animate-pulse',
    };
  } else {
    return {
      isOpen: false,
      text: `Closed now • Opens at ${startStr}`,
      colorClass: 'text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
      dotColorClass: 'bg-rose-500',
    };
  }
}
