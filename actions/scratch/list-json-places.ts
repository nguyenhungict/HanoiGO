import * as fs from 'fs';
import * as path from 'path';

const jsonPath = path.resolve(__dirname, '../../../dataset/popular_hanoi_landmarks_hours.json');
const rawData = fs.readFileSync(jsonPath, 'utf-8');
const cleanedData = rawData.replace(/:\s*NaN/g, ': null');
const places: any[] = JSON.parse(cleanedData);

console.log(`Total JSON places: ${places.length}`);

// Print all tags
const allTags = new Set<string>();
places.forEach(p => {
  if (p.tags) {
    p.tags.split(' • ').forEach((t: string) => allTags.add(t));
  }
});
console.log("All tags in JSON:", Array.from(allTags).sort());

// List all places and check if they belong to food/drink
console.log("\nAll places:");
places.forEach(p => {
  console.log(`- Name: ${p.name} | Tags: ${p.tags}`);
});
