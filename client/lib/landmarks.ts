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

// API fetch function
export async function fetchLandmarks(): Promise<Landmark[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888';
    // Force revalidation to bypass any Next.js or browser cache
    const response = await fetch(`${baseUrl}/places`, { 
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });
    
    if (!response.ok) throw new Error('Failed to fetch from API');
    const responseData = await response.json();
    const data = Array.isArray(responseData) ? responseData : (responseData.places || []);
    
    // Highly reliable Unsplash static placeholders
    const getPlaceholder = (category: string) => {
      const cat = (category || '').toLowerCase();
      if (cat.includes('museum') || cat.includes('historic')) 
        return "https://images.unsplash.com/photo-1599708153386-62bf3f03361a?w=800&q=80";
      if (cat.includes('temple') || cat.includes('pagoda')) 
        return "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&q=80";
      if (cat.includes('lake') || cat.includes('water')) 
        return "https://images.unsplash.com/photo-1559592442-741e6b89cc46?w=800&q=80";
      if (cat.includes('food') || cat.includes('cafe')) 
        return "https://images.unsplash.com/photo-1555921015-5532091f6026?w=800&q=80";
      return "https://images.unsplash.com/photo-1509030450996-93f25ef2030f?w=800&q=80";
    };

    return data.map((p: any) => {
      const category = p.category || 'Sightseeing';
      const placeholder = getPlaceholder(category);
      
      // Defensive check: if imageUrl exists but is a broken/deprecated link, use placeholder
      const isValidImage = p.imageUrl && !p.imageUrl.includes('source.unsplash.com');
      
      return {
        id: p.id,
        name: p.name,
        image: isValidImage ? p.imageUrl : placeholder,
        gallery: (p.gallery && p.gallery.length > 0) 
          ? p.gallery.map((img: any) => img.url).filter((url: string) => !url.includes('source.unsplash.com'))
          : [placeholder],
        rating: 4.5,
        category: category,
        description: p.descriptionEn || "",
        lat: p.lat,
        lng: p.lng
      };
    });
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

function getCategoryLens(category: string) {
  const value = category.toLowerCase();

  if (value.includes('art') || value.includes('museum') || value.includes('theater')) {
    return {
      eyebrow: 'Arts & Culture',
      mood: 'creative expression, quiet observation, and layered cultural timelines',
      focus: 'galleries, performance spaces, and the artistic pulse of Hanoi',
    };
  }

  if (value.includes('spiritual') || value.includes('temple')) {
    return {
      eyebrow: 'Sacred Layer',
      mood: 'ritual calm, incense, and a slower ceremonial tempo',
      focus: 'symbolic details, courtyards, altars, and contemplative spaces',
    };
  }

  if (value.includes('eat') || value.includes('shop')) {
    return {
      eyebrow: 'Local Pulse',
      mood: 'commerce, conversation, and the dense choreography of daily life',
      focus: 'street textures, local flavors, and the social energy of markets and cafes',
    };
  }

  if (value.includes('heritage') || value.includes('historic')) {
    return {
      eyebrow: 'Historic Trace',
      mood: 'monumental form, visible age, and strong urban symbolism',
      focus: 'architectural silhouettes, historical turning points, and urban heritage',
    };
  }

  if (value.includes('nature') || value.includes('outdoor')) {
    return {
      eyebrow: 'Open Air Frame',
      mood: 'breathing room, horizon lines, and a softer city cadence',
      focus: 'landscape atmosphere, movement, and the contrast with the dense urban fabric',
    };
  }

  return {
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
        title: 'Opening Frame',
        body: baseDescription,
      },
      {
        title: 'Why It Matters',
        body: `${landmark.name} is best understood through ${lens.focus}. It works not only as a destination, but as a lens on the surrounding district and its cultural tempo.`,
      },
      {
        title: 'How To Read The Place',
        body: `Arrive with enough time to notice transitions in sound, movement, and material detail. The strongest experience here comes from observing how visitors, locals, and the setting shape one another in real time.`,
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
        label: 'Map Position',
        value: `${landmark.lat.toFixed(3)}, ${landmark.lng.toFixed(3)}`,
      },
    ],
  };
}
