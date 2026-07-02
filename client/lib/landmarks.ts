import { resolveImageUrl } from './actions/config';

export interface Landmark {
  id: string;
  name: string;
  image: string;
  gallery: string[];
  rating: number;
  category: string;
  description: string;
  lat: number;
  lng: number;
  district?: string;
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

const CLIENT_CACHE_KEY = 'hanoigo_landmarks_v1';
const CLIENT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
    // Server-side: Next.js caches this for 1 hour; client-side: browser HTTP cache applies
    const response = await fetch(`${baseUrl}/places`, {
      next: { revalidate: 3600, tags: ['landmarks'] },
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
        district: p.district || 'Hoan Kiem'
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
