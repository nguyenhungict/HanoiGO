const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../client/public/data/landmarks.json');
const landmarks = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const mapping = {
  // Nature & Outdoors
  'Lake': 'Nature & Outdoors',
  'Park': 'Nature & Outdoors',
  'Parks': 'Nature & Outdoors',
  'Bodies of Water': 'Nature & Outdoors',
  
  // Arts & Culture
  'Museum': 'Arts & Culture',
  'Museums': 'Arts & Culture',
  'Art Gallery': 'Arts & Culture',
  'Theater': 'Arts & Culture',
  'Culture': 'Arts & Culture',
  
  // Heritage & History
  'Historic Site': 'Heritage & History',
  'Neighborhood': 'Heritage & History',
  
  // Spiritual
  'Temple': 'Spiritual',
  
  // Eat & Shop
  'Food & Cafe': 'Eat & Shop',
  'Market': 'Eat & Shop',
  'Markets': 'Eat & Shop',
  
  // Sightseeing
  'Sightseeing': 'Sightseeing'
};

const updatedLandmarks = landmarks.map(landmark => {
  const oldCat = landmark.category;
  const newCat = mapping[oldCat] || oldCat;
  return { ...landmark, category: newCat };
});

fs.writeFileSync(filePath, JSON.stringify(updatedLandmarks, null, 2));
console.log('Updated landmarks.json static file.');
