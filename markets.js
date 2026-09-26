export const MARKETS = [
  {code: 'SE', name: 'Sweden', currency: 'SEK', cities: ['Umeå', 'Stockholm', 'Göteborg', 'Malmö', 'Uppsala'], paymentHint: 'Swish / card later', verifyHint: 'BankID + company check'},
  {code: 'GB', name: 'United Kingdom', currency: 'GBP', cities: ['London', 'Manchester', 'Birmingham'], paymentHint: 'Card later', verifyHint: 'ID check later'},
  {code: 'US', name: 'United States', currency: 'USD', cities: ['New York', 'Austin', 'Chicago'], paymentHint: 'Card later', verifyHint: 'ID + background check later'},
  {code: 'DE', name: 'Germany', currency: 'EUR', cities: ['Berlin', 'Munich', 'Hamburg'], paymentHint: 'SEPA / card later', verifyHint: 'ID + Gewerbe later'},
  {code: 'NG', name: 'Nigeria', currency: 'NGN', cities: ['Lagos', 'Abuja'], paymentHint: 'Local transfer later', verifyHint: 'ID + business check later'},
  {code: 'KE', name: 'Kenya', currency: 'KES', cities: ['Nairobi', 'Mombasa'], paymentHint: 'M-Pesa later', verifyHint: 'ID + business check later'}
];

export const seedUsers = [
  {id: 'u_demo', name: 'Demo Customer', email: 'demo@ouskeyfix.com', role: 'customer', city: 'Umeå', country: 'SE'},
  {id: 'p1', name: 'NorthFix Home Services', role: 'professional', country: 'SE', city: 'Umeå'},
  {id: 'p2', name: 'Umeå HandyPro', role: 'professional', country: 'SE', city: 'Umeå'},
  {id: 'p3', name: 'Clean & Move Umeå', role: 'professional', country: 'SE', city: 'Umeå'},
  {id: 'p4', name: 'London FlatFix', role: 'professional', country: 'GB', city: 'London'},
  {id: 'p5', name: 'Austin Handy Co', role: 'professional', country: 'US', city: 'Austin'},
  {id: 'p6', name: 'Berlin WohnService', role: 'professional', country: 'DE', city: 'Berlin'},
  {id: 'p7', name: 'Lagos Home Crew', role: 'professional', country: 'NG', city: 'Lagos'},
  {id: 'p8', name: 'Nairobi FixPoint', role: 'professional', country: 'KE', city: 'Nairobi'}
];

export const seedProfessionals = [
  {id: 'p1', name: 'NorthFix Home Services', service: 'Furniture assembly & carpentry', rating: 4.9, jobs: 142, distance: '2.4 km', price: 'From 450 SEK', verified: true, verification: 'complete', available: 'Today 18:00', city: 'Umeå', country: 'SE', currency: 'SEK', services: ['Furniture assembly', 'Carpentry', 'Home repair']},
  {id: 'p2', name: 'Umeå HandyPro', service: 'Home repairs & assembly', rating: 4.8, jobs: 98, distance: '4.1 km', price: 'Quote required', verified: true, verification: 'complete', available: 'Tomorrow', city: 'Umeå', country: 'SE', currency: 'SEK', services: ['Home repair', 'Furniture assembly']},
  {id: 'p3', name: 'Clean & Move Umeå', service: 'Cleaning & moving', rating: 4.7, jobs: 76, distance: '6.3 km', price: 'From 550 SEK', verified: false, verification: 'pending', available: 'Today 19:00', city: 'Umeå', country: 'SE', currency: 'SEK', services: ['Cleaning', 'Moving']},
  {id: 'p4', name: 'London FlatFix', service: 'Furniture assembly & home repair', rating: 4.6, jobs: 210, distance: '3.1 km', price: 'From £65', verified: true, verification: 'complete', available: 'Today', city: 'London', country: 'GB', currency: 'GBP', services: ['Furniture assembly', 'Home repair']},
  {id: 'p5', name: 'Austin Handy Co', service: 'Home repair & assembly', rating: 4.8, jobs: 88, distance: '5.0 km', price: 'From $79', verified: true, verification: 'complete', available: 'Tomorrow', city: 'Austin', country: 'US', currency: 'USD', services: ['Home repair', 'Furniture assembly']},
  {id: 'p6', name: 'Berlin WohnService', service: 'Cleaning & moving', rating: 4.5, jobs: 64, distance: '2.8 km', price: 'From 59 EUR', verified: false, verification: 'pending', available: 'This week', city: 'Berlin', country: 'DE', currency: 'EUR', services: ['Cleaning', 'Moving']},
  {id: 'p7', name: 'Lagos Home Crew', service: 'Home repair & moving', rating: 4.4, jobs: 120, distance: '4.6 km', price: 'Quote in NGN', verified: false, verification: 'pending', available: 'Today', city: 'Lagos', country: 'NG', currency: 'NGN', services: ['Home repair', 'Moving']},
  {id: 'p8', name: 'Nairobi FixPoint', service: 'Furniture assembly & repairs', rating: 4.7, jobs: 73, distance: '3.4 km', price: 'Quote in KES', verified: true, verification: 'complete', available: 'Tomorrow', city: 'Nairobi', country: 'KE', currency: 'KES', services: ['Furniture assembly', 'Home repair']}
];
