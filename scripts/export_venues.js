const fs = require('fs');
const path = require('path');

const seedSql = fs.readFileSync('D:/cpj/web/db/seed.sql', 'utf8');

// Parse sport types
const sportsMap = {
  1: { id: 1, name: 'Футбол', slug: 'football' },
  2: { id: 2, name: 'Баскетбол', slug: 'basketball' },
  3: { id: 3, name: 'Волейбол', slug: 'volleyball' },
  4: { id: 4, name: 'Универсальная площадка', slug: 'universal' },
  5: { id: 5, name: 'Легкая атлетика', slug: 'athletics' }
};

// Match values in INSERT INTO venues
// Pattern: (id, 'name', 'address', 'district', 'bank', lat, lon, sport_id, 'dim', 'surface', lighting, fence, 'desc', active)
const venueRegex = /\((\d+),\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*([0-9.]+),\s*([0-9.]+),\s*(\d+),\s*'([^']+)',\s*'([^']+)',\s*(true|false),\s*(true|false),\s*'([^']*)',\s*(true|false)\)/g;

let match;
const venues = [];
let imgCounters = { football: 0, basketball: 0, volleyball: 0, universal: 0, athletics: 0 };

while ((match = venueRegex.exec(seedSql)) !== null) {
  const sportId = parseInt(match[8], 10);
  const sport = sportsMap[sportId] || { name: 'Спорт', slug: 'universal' };
  
  imgCounters[sport.slug] = (imgCounters[sport.slug] % 8) + 1;
  const imagePath = `file:///android_asset/images/${sport.slug}/${imgCounters[sport.slug]}.jpg`;

  venues.push({
    id: parseInt(match[1], 10),
    name: match[2],
    address: match[3],
    district: match[4],
    bank: match[5],
    latitude: parseFloat(match[6]),
    longitude: parseFloat(match[7]),
    sportTypeId: sportId,
    sportName: sport.name,
    sportSlug: sport.slug,
    dimensions: match[9],
    surfaceType: match[10],
    hasLighting: match[11] === 'true',
    hasFence: match[12] === 'true',
    description: match[13],
    imageUrl: imagePath,
    workingHours: '08:00 - 22:00'
  });
}

console.log(`Parsed ${venues.length} venues.`);
fs.writeFileSync('D:/cpj/mobil/app/src/main/assets/demo_venues.json', JSON.stringify(venues, null, 2), 'utf8');
console.log('Saved to D:/cpj/mobil/app/src/main/assets/demo_venues.json');
