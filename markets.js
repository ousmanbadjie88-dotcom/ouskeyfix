export const MARKETS = [
  {code: 'SE', name: 'Sweden', currency: 'SEK', cities: ['Umeå', 'Stockholm', 'Göteborg', 'Malmö', 'Uppsala'], paymentHint: 'Swish / card later', verifyHint: 'BankID + company check'},
  {code: 'GB', name: 'United Kingdom', currency: 'GBP', cities: ['London', 'Manchester', 'Birmingham'], paymentHint: 'Card later', verifyHint: 'ID check later'},
  {code: 'US', name: 'United States', currency: 'USD', cities: ['New York', 'Austin', 'Chicago'], paymentHint: 'Card later', verifyHint: 'ID + background check later'},
  {code: 'DE', name: 'Germany', currency: 'EUR', cities: ['Berlin', 'Munich', 'Hamburg'], paymentHint: 'SEPA / card later', verifyHint: 'ID + Gewerbe later'},
  {code: 'NG', name: 'Nigeria', currency: 'NGN', cities: ['Lagos', 'Abuja'], paymentHint: 'Local transfer later', verifyHint: 'ID + business check later'},
  {code: 'KE', name: 'Kenya', currency: 'KES', cities: ['Nairobi', 'Mombasa'], paymentHint: 'M-Pesa later', verifyHint: 'ID + business check later'}
];

export const CATS = ['Furniture assembly','Carpentry','Home repair','Cleaning','Moving','Garden services','Car mechanic','Plumbing','Electrical','Painting','Locksmith','Building construction'];

function pro(id, name, service, services, extra = {}) {
  return { id, name, service, services, rating: extra.rating || 4.7, jobs: extra.jobs || 64, distance: extra.distance || '3.2 km', price: extra.price || 'Quote required', verified: extra.verified !== false, verification: extra.verified === false ? 'pending' : 'complete', available: extra.available || 'Today', city: extra.city || 'Umeå', country: extra.country || 'SE', currency: extra.currency || 'SEK' };
}

export const seedProfessionals = [
  pro('p1', 'NorthFix Home Services', 'Furniture assembly & carpentry', ['Furniture assembly', 'Carpentry', 'Home repair'], {rating: 4.9, jobs: 142, distance: '2.4 km', price: 'From 450 SEK', available: 'Today 18:00'}),
  pro('p2', 'Umeå HandyPro', 'Home repairs & assembly', ['Home repair', 'Furniture assembly'], {rating: 4.8, jobs: 98, distance: '4.1 km', price: 'Quote required', available: 'Tomorrow'}),
  pro('p3', 'Clean & Move Umeå', 'Cleaning & moving', ['Cleaning', 'Moving'], {rating: 4.7, jobs: 76, distance: '6.3 km', price: 'From 550 SEK', verified: false, available: 'Today 19:00'}),
  pro('p9', 'Umeå Garden Crew', 'Garden and lawn care', ['Garden services'], {price: 'From 499 SEK', distance: '5.1 km'}),
  pro('p10', 'Norrland Mek & Däck', 'Car mechanic and tyre service', ['Car mechanic'], {price: 'From 690 SEK', distance: '3.8 km', jobs: 210}),
  pro('p11', 'Umeå Rörjour', 'Plumbing and leaks', ['Plumbing'], {price: 'From 750 SEK', distance: '2.9 km'}),
  pro('p12', 'Volt Norr El', 'Electrical repairs', ['Electrical'], {price: 'From 850 SEK', distance: '4.4 km'}),
  pro('p13', 'Måleri Umeå', 'Indoor and outdoor painting', ['Painting'], {price: 'From 599 SEK', distance: '6.0 km'}),
  pro('p14', 'Umeå Låssmed', 'Locksmith and keys', ['Locksmith'], {price: 'From 890 SEK', distance: '1.8 km', available: 'Now'}),
  pro('p20', 'Norrbygg Umeå', 'Building and construction', ['Building construction'], {price: 'Quote required', distance: '4.7 km', jobs: 88}),
  pro('p4', 'London FlatFix', 'Furniture assembly & home repair', ['Furniture assembly', 'Home repair'], {city: 'London', country: 'GB', currency: 'GBP', price: 'From £65', distance: '3.1 km', jobs: 210}),
  pro('p5', 'Austin Handy Co', 'Home repair & assembly', ['Home repair', 'Furniture assembly'], {city: 'Austin', country: 'US', currency: 'USD', price: 'From $79', distance: '5.0 km'}),
  pro('p6', 'Berlin WohnService', 'Cleaning & moving', ['Cleaning', 'Moving'], {city: 'Berlin', country: 'DE', currency: 'EUR', price: 'From 59 EUR', verified: false}),
  pro('p7', 'Lagos Home Crew', 'Home repair & moving', ['Home repair', 'Moving'], {city: 'Lagos', country: 'NG', currency: 'NGN', price: 'Quote in NGN', verified: false}),
  pro('p8', 'Nairobi FixPoint', 'Furniture assembly & repairs', ['Furniture assembly', 'Home repair'], {city: 'Nairobi', country: 'KE', currency: 'KES', price: 'Quote in KES'})
];

export const seedUsers = [
  {id: 'u_admin', name: 'Ousman Badjie', email: 'badjieart@gmail.com', role: 'admin', city: 'Umeå', country: 'SE'},
  {id: 'u_demo', name: 'Demo Customer', email: 'demo@ouskeyfix.com', role: 'customer', city: 'Umeå', country: 'SE'},
  ...seedProfessionals.map(p => ({id: p.id, name: p.name, role: 'professional', country: p.country, city: p.city}))
];
