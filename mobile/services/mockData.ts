export const MockUser = {
  id: 'u1',
  name: 'Rajesh Kumar',
  mobile: '+91 9876543210',
  village: 'Palampur',
  district: 'Kangra',
  state: 'Himachal Pradesh',
  avatar: 'https://i.pravatar.cc/150?u=rajesh',
};

export const MockWeather = {
  current: {
    temp: 28,
    condition: 'Partly Cloudy',
    humidity: 62,
    wind: '12 km/h',
    rainProb: 15,
  },
  forecast: [
    { day: 'Mon', temp: 29, condition: 'Sunny' },
    { day: 'Tue', temp: 27, condition: 'Rain' },
    { day: 'Wed', temp: 28, condition: 'Cloudy' },
    { day: 'Thu', temp: 30, condition: 'Sunny' },
    { day: 'Fri', temp: 31, condition: 'Sunny' },
  ],
  alerts: [
    { id: 'a1', message: 'Rain expected tomorrow. Check your irrigation plan.', type: 'warning' }
  ]
};

export const MockFields = [
  {
    id: 'f1',
    name: 'North Field',
    crop: 'Wheat',
    area: '5 Bigha',
    plantingDate: '2026-08-15',
    healthStatus: 'Good',
    healthPercent: 85,
    lastChecked: 'Today',
  },
  {
    id: 'f2',
    name: 'East Field',
    crop: 'Mustard',
    area: '3 Bigha',
    plantingDate: '2026-09-01',
    healthStatus: 'Moderate',
    healthPercent: 65,
    lastChecked: '2 days ago',
  }
];

export const MockIrrigationPlans = [
  {
    id: 'i1',
    fieldId: 'f1',
    crop: 'Wheat',
    recommendedDate: 'Today',
    estimatedDuration: '3-4 hours',
    waterRequirement: '12,000 Liters',
    status: 'pending',
  }
];

export const MockEquipment = [
  {
    id: 'e1',
    name: 'Mahindra Tractor 575 DI',
    category: 'Tractor',
    owner: 'Suresh Singh',
    location: 'Palampur (2km away)',
    pricePerDay: 1500,
    availability: 'Available',
    image: 'https://images.unsplash.com/photo-1592982537447-6f29402513f5?auto=format&fit=crop&q=80&w=400',
    description: 'Good condition tractor, suitable for ploughing and transport.',
  },
  {
    id: 'e2',
    name: 'Heavy Duty Rotavator',
    category: 'Rotavator',
    owner: 'Kisan Kendra',
    location: 'Dharamshala (15km away)',
    pricePerDay: 800,
    availability: 'Available from tomorrow',
    image: 'https://images.unsplash.com/photo-1629853381665-27a3c75ebc08?auto=format&fit=crop&q=80&w=400',
    description: '7-foot rotavator for fine soil preparation.',
  }
];

export const MockNotifications = [
  { id: 'n1', title: 'AI Crop Alert', message: 'Mild stress detected in North Field. Consider adding urea.', time: '2 hours ago', read: false, type: 'ai' },
  { id: 'n2', title: 'Weather Update', message: 'Heavy rain expected on Tuesday.', time: '5 hours ago', read: true, type: 'weather' },
  { id: 'n3', title: 'Equipment Request', message: 'Suresh accepted your tractor rental request.', time: '1 day ago', read: true, type: 'equipment' },
];

export const MockDiseaseAnalysis = {
  crop: 'Wheat',
  status: 'Healthy',
  confidence: 94,
  findings: 'No significant signs of yellow rust or blight. Leaf coloration is normal for this growth stage.',
  actions: [
    'Maintain current irrigation schedule',
    'Monitor for aphids as temperature rises'
  ]
};

export const MockMandiPrices = [
  { id: 'm1', crop: 'Wheat', price: '₹2,275', unit: '/ quintal', trend: 'up', trendValue: '+₹25', location: 'Palampur Mandi' },
  { id: 'm2', crop: 'Mustard', price: '₹5,450', unit: '/ quintal', trend: 'down', trendValue: '-₹50', location: 'Kangra Mandi' },
];

export const MockCalendarEvents = [
  { id: 'c1', title: 'Apply Urea Fertilizer', date: 'Tomorrow', type: 'fertilizer', field: 'North Field (Wheat)', description: 'AI suggests applying 20kg Urea based on current growth stage.' },
  { id: 'c2', title: 'Expected Heavy Rain', date: 'Sep 25', type: 'weather', field: 'All Fields', description: 'Delay irrigation until after the rain passes.' },
  { id: 'c3', title: 'Harvest Preparation', date: 'Oct 15', type: 'harvest', field: 'East Field (Mustard)', description: 'Crop will be ready for harvest. Book equipment now.' },
];
