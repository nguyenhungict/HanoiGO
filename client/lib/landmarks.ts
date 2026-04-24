import landmarksData from '@/public/data/landmarks.json';

export interface Landmark {
  id: string;
  name: string;
  image: string;
  rating: number;
  category: string;
  description: string;
  lat: number;
  lng: number;
}

type PlaceStory = {
  eyebrow: string;
  intro: string;
  archiveNote: string;
  sections: { title: string; body: string }[];
  facts: { label: string; value: string }[];
};

export const landmarks = landmarksData as Landmark[];

function cleanDescription(description: string, name: string, category: string) {
  const normalized = description.replace(/â€¦/g, '...').trim();
  if (normalized) return normalized;

  return `${name} is one of Hanoi's most memorable ${category.toLowerCase()} destinations, carrying a strong sense of place and a distinct local rhythm.`;
}

function getCategoryLens(category: string) {
  const value = category.toLowerCase();

  if (value.includes('museum')) {
    return {
      eyebrow: 'Curated Memory',
      mood: 'quiet observation, layered timelines, and carefully preserved civic memory',
      focus: 'gallery rooms, artifacts, and the stories that frame Hanoi across generations',
    };
  }

  if (value.includes('religious') || value.includes('temple') || value.includes('pagoda')) {
    return {
      eyebrow: 'Sacred Layer',
      mood: 'ritual calm, incense, and a slower ceremonial tempo',
      focus: 'symbolic details, courtyards, altars, and the transition from street noise to contemplative space',
    };
  }

  if (value.includes('market') || value.includes('shopping') || value.includes('coffee')) {
    return {
      eyebrow: 'Street Energy',
      mood: 'commerce, conversation, and the dense choreography of daily life',
      focus: 'textures, storefront habits, and the social pulse that makes the area feel alive',
    };
  }

  if (value.includes('theater') || value.includes('performance')) {
    return {
      eyebrow: 'Live Culture',
      mood: 'staging, anticipation, and a heightened public atmosphere',
      focus: "the performance tradition itself and the role the venue plays in the city's cultural identity",
    };
  }

  if (value.includes('historic') || value.includes('landmark') || value.includes('bridge')) {
    return {
      eyebrow: 'Historic Trace',
      mood: 'monumental form, visible age, and strong urban symbolism',
      focus: 'architectural silhouette, historical turning points, and how the site anchors the wider district',
    };
  }

  if (value.includes('water') || value.includes('park')) {
    return {
      eyebrow: 'Open Air Frame',
      mood: 'breathing room, horizon lines, and a softer city cadence',
      focus: 'landscape atmosphere, movement, and the contrast between nature and dense urban fabric',
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
