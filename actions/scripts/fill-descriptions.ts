import * as fs from 'fs';
import * as path from 'path';

const DESCRIPTIONS_MAP: Record<string, string> = {
  "B52 Victory Museum": "Dedicated to the military history of Vietnam, showcasing the debris of US B-52 bombers shot down during the Christmas bombings of 1972.",
  "Bach Ma Temple": "Located in Hanoi's Old Quarter, this is the city's oldest temple, built in the 9th century and dedicated to the White Horse guardian spirit.",
  "Ba Dinh Square": "The historic square where President Ho Chi Minh read the Declaration of Independence in 1945, now home to the Ho Chi Minh Mausoleum.",
  "Bat Trang Ceramic Village": "A traditional pottery village on the outskirts of Hanoi, famous for its high-quality ceramic artwork and hands-on clay workshops.",
  "Ca Tru Thang Long": "A traditional chamber music performance club dedicated to preserving Ca Tru, an ancient Vietnamese musical storytelling form recognized by UNESCO.",
  "Cau The Huc": "The iconic red-painted wooden bridge across Hoan Kiem Lake, connecting the lakeshore to the historic Ngoc Son Temple.",
  "Chua Tran Quoc": "The oldest Buddhist pagoda in Hanoi, standing on a small island in West Lake with a history dating back over 1,500 years.",
  "Dinh Le Book Street": "A popular pedestrian street near Hoan Kiem Lake, lined with bookshops and outdoor book stalls, a quiet haven for readers.",
  "Dinh Q. Le Gallery": "A contemporary art space featuring works of local and international artists, exploring history, memory, and cultural identity.",
  "Dong Kinh Nghia Thuc Square": "A bustling public square at the northern end of Hoan Kiem Lake, serving as a major hub for weekend street performances and city gatherings.",
  "Dong Xuan Market": "Hanoi's largest indoor market, offering wholesale and retail goods, local street food, and a vibrant peak into local trading habits.",
  "Fine Arts Museum (Bao Tang My Thuat)": "Showcases Vietnam's artistic legacy from ancient stone carvings and religious sculptures to modern paintings, woodcuts, and lacquer art.",
  "GOm Show": "An interactive cultural and theatrical performance highlighting traditional Vietnamese arts, folk music, and legendary stories.",
  "Ham Long Church": "A beautiful historic Roman Catholic church built in the early 20th century, known for its elegant French colonial architecture and tall bell tower.",
  "Hang Bac Street": "One of the oldest streets in Hanoi's Old Quarter, historically famous for silver-smithing, jewelry making, and traditional merchant houses.",
  "Hang Dau Street": "A lively historical street in the Old Quarter, famous for shoe merchants and its proximity to the historic Hang Dau Water Tower.",
  "Hang Gai Silk Street": "The premier shopping street in Hanoi for high-quality silk products, custom tailoring, and traditional Vietnamese crafts.",
  "Hang Ma Street": "A colorful Old Quarter street known for selling paper offerings, festival decorations, lanterns, and traditional toys throughout the year.",
  "Hanoi Ceramic Mosaic Mural": "A massive, colorful ceramic mosaic running along the Red River dike road, built to celebrate the Hanoi Millennium in 2010.",
  "Hanoi Creative City": "An arts and culture hub housed in a repurposed building, featuring cafes, art galleries, and creative workshops for local youth.",
  "Hanoi Flag Tower": "One of the symbols of the city, this historic stone tower stands in the Military History Museum complex, built in 1812.",
  "Hanoi Old Citadel - Northern Gate": "The historic northern gate of the Thang Long Imperial Citadel, showing cannon fire scars from the French invasions in the 19th century.",
  "Hanoi Old Quarter Vietnam": "The historical heart of the city, characterized by narrow streets named after traditional crafts, old merchant homes, and vibrant street life.",
  "Hanoi Opera House": "A magnificent neoclassical opera house built by the French administration between 1901 and 1911, serving as a cultural landmark.",
  "Hanoi Police Museum": "Displays historic artifacts, uniforms, and documents detailing the history, development, and operations of the Hanoi police force.",
  "Hanoi Train Street": "A famous narrow residential street where trains pass just inches from local cafes and doorsteps, an iconic photo spot for visitors.",
  "Hanoi Zoo (Thu Le Zoo)": "A peaceful city park and zoo located around Thu Le Lake, offering a green escape and family-friendly walking paths.",
  "Heritage Space": "An independent art space hosting contemporary art exhibitions, music concerts, library discussions, and creative workshops.",
  "Hoa Lo Prison": "Originally built by French colonists to hold political prisoners, later used for American POWs, now a moving historical museum.",
  "Hoang Hoa Tham Flower Street": "A bustling green street famous for plant nurseries, florist shops, ornamental trees, and street vendors selling seasonal flowers.",
  "Hoan Kiem Lake": "The peaceful heart of Hanoi, surrounded by walking paths, home to the Tortoise Tower and linked to the legend of the restored sword.",
  "Ho Chi Minh Mausoleum": "The grand marble monument housing the embalmed body of President Ho Chi Minh, located in the historic Ba Dinh Square.",
  "Ho Chi Minh Museum": "Designed in the shape of a white lotus, this museum is dedicated to the life, revolutionary struggle, and global legacy of Ho Chi Minh.",
  "Ho Chi Minh's Stilt House": "The simple wooden stilt house where President Ho Chi Minh lived and worked from 1958 until his death in 1969, set in a tranquil garden.",
  "Ho Tay Water Park": "A popular amusement park on the shore of West Lake, featuring water slides, lazy rivers, wave pools, and summer activities.",
  "Huu Tiep Lake (B52 Lake)": "A quiet neighborhood lake in Ngoc Ha flower village, containing the rusted wreckage of a shot-down B-52 bomber from 1972.",
  "Imperial Citadel of Thang Long": "A UNESCO World Heritage site, serving as the political center of Vietnam for 13 consecutive centuries, featuring ancient foundations and relics.",
  "Kim Lien Pagoda": "An ancient Buddhist pagoda built on a peninsula in West Lake, famous for its elegant wood carvings and peaceful lakeside atmosphere.",
  "Landmark 72 Sky View": "An observation deck on the 72nd floor of Keangnam Tower, offering stunning 360-degree panoramic views of Hanoi.",
  "Lenin Park": "A public park in Ba Dinh district, featuring a bronze statue of Vladimir Lenin, popular for local exercise and skateboarding.",
  "Long Bien Bridge": "A historic cantilever bridge across the Red River, designed by Eiffel's company, serving as a symbol of Hanoi's resilience.",
  "Lotte Mall West Lake": "A modern commercial complex near West Lake, featuring high-end shopping, dining, an aquarium, and family entertainment.",
  "Lotte Observation Deck": "Located on the 65th floor of the Lotte Center, offering a glass-bottomed walk and panoramic views of the city skyline.",
  "Ly Thai To Park": "A lakeside public square featuring a large bronze statue of King Ly Thai To, the founder of Hanoi (Thang Long) in 1010 AD.",
  "Ma May Ancient House": "A beautifully restored traditional tube house in the Old Quarter, showing the lifestyle and architecture of 19th-century merchants.",
  "Nghia Do Park": "A popular family park in Cau Giay district, featuring vast green lawns, walking paths, play areas, and a central lake.",
  "Ngoc Khanh Lake": "A scenic neighborhood lake surrounded by walking paths, cafes, and shops, popular for evening strolls.",
  "Ngoc Son Temple": "A scenic temple situated on Jade Island in Hoan Kiem Lake, dedicated to General Tran Hung Dao and scholar Van Xuong.",
  "Night Market": "A weekend pedestrian market stretching through the Old Quarter, filled with food stalls, clothing, and local souvenirs.",
  "Old Quarter": "Hanoi's historic center, featuring 36 streets of traditional craft guilds, architectural styles, and vibrant street culture.",
  "One Pillar Pagoda": "An iconic historic Buddhist temple built on a single stone pillar in the middle of a lotus pond, dating back to 1049 AD.",
  "Phan Dinh Phung Street": "One of Hanoi's most beautiful tree-lined boulevards, famous for its French colonial villas and yellow leaves in autumn.",
  "Phu Tay Ho": "A highly revered spiritual temple on a peninsula in West Lake, dedicated to the Mother Goddess Lieu Hanh.",
  "Quan Su Pagoda": "The headquarters of the Vietnam Buddhist Sangha, a beautiful historic temple serving as a center for Buddhist activities.",
  "Quan Thanh Temple": "An 11th-century Taoist temple near West Lake, dedicated to Huyen Thien Tran Vu, one of the four guardian gods of ancient Hanoi.",
  "Royal City Vincom Mega Mall": "An underground mega-mall featuring European-style architectures, shopping, an ice rink, and indoor theme parks.",
  "Salon Natasha": "Hanoi's first private art gallery opened after Doi Moi, a historic meeting place for contemporary artists in the 1990s.",
  "St. Joseph's Cathedral": "A grand 19th-century Gothic Revival church resembling Notre Dame de Paris, a focal point for Hanoi's Christian community.",
  "Ta Hien Street": "The famous 'beer street' in the Old Quarter, packed with international travelers, local youth, street food, and nightlife.",
  "Tay Ho Promenade": "A scenic walking path along the banks of West Lake, lined with restaurants, cafes, and beautiful sunset views.",
  "Temple of Literature": "Vietnam's first national university, built in 1070 AD, dedicated to Confucius and showcasing historic stone steles of scholars.",
  "Thang Long Water Puppet Theater": "The premier venue for water puppetry, a traditional art form originating in the flooded rice paddies of northern Vietnam.",
  "Thap Rua Tower": "The iconic Tortoise Tower standing on a small island in Hoan Kiem Lake, a symbol of Hanoi's history and mythology.",
  "Thien Quang Lake": "A peaceful park lake surrounded by old trees, providing a green breathing space near the southern edge of the Old Quarter.",
  "Thong Nhat Park": "Hanoi's largest public park, featuring Bay Mau Lake, walking paths, gardens, and a tranquil escape from urban noise.",
  "Times City": "A modern urban complex featuring high-rise buildings, shopping centers, an aquarium, and musical fountain shows.",
  "Truc Bach Lake": "A scenic lake separated from West Lake by Thanh Nien Road, famous for swan pedal boats, cafes, and historical monuments.",
  "USTH": "University of Science and Technology of Hanoi, a modern public research university established under a bilateral agreement between Vietnam and France.",
  "Van Phuc Silk Village": "A traditional silk-weaving village on the edge of Hanoi, renowned for producing exquisite high-grade silk products.",
  "VICAS Art Studio": "A contemporary art gallery and creative space managed by the Vietnam Institute of Culture and Arts Studies.",
  "Vietnamese Women's Museum": "A highly-rated museum highlighting the roles, history, and contributions of women in Vietnamese family, war, and society.",
  "Vietnam Military History Museum": "Displays historic tanks, fighter aircraft, weaponry, and exhibits detailing Vietnam's military struggle for independence.",
  "Vietnam Museum of Ethnology": "A fascinating museum showcasing the cultures, lifestyles, houses, and traditional clothing of Vietnam's 54 ethnic groups.",
  "Vietnam Museum of Fine Arts": "The country's premier art museum, displaying historical artifacts, Buddhist sculptures, lacquer paintings, and modern arts.",
  "Vietnam National Museum of History": "Houses a rich collection of archaeological artifacts tracing the history of Vietnam from prehistory to the mid-20th century.",
  "Vietnam National Tuong Theatre": "A performance center dedicated to Tuong, a classical Vietnamese opera form known for elaborate makeup and singing.",
  "West Lake": "Hanoi's largest freshwater lake, surrounded by historic temples, luxury hotels, upscale dining, and popular walking paths.",
  "Work Room Four": "A contemporary design studio, art gallery, and creative workshop space supporting local and international artists in Hanoi.",
};

async function main() {
  const jsonPath = path.resolve(__dirname, '../../places_import_data/places_data.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ File not found: ${jsonPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const places = JSON.parse(raw);

  console.log(`📊 Processing ${places.length} places...`);
  let filledCount = 0;
  let nameFixCount = 0;

  const updated = places.map((place: any) => {
    let name = place.name;
    
    // Fix malformed name for Duong Tau
    if (name.includes('????') || name === '???????ng T??u') {
      name = 'Duong Tau (Train Street)';
      place.name = name;
      nameFixCount++;
    }

    const description = DESCRIPTIONS_MAP[name] || DESCRIPTIONS_MAP[place.name] || "";
    if (description && !place.descriptionEn) {
      place.descriptionEn = description;
      filledCount++;
    }
    return place;
  });

  fs.writeFileSync(jsonPath, JSON.stringify(updated, null, 2), 'utf-8');
  console.log(`✅ Finished! Filled ${filledCount} descriptions and fixed ${nameFixCount} place names.`);
}

main().catch(console.error);
