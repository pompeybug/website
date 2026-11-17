// How the articles are organised. Every article sits in one section; tags
// are the finer-grained topics that cut across sections.

export const SECTIONS = [
  { slug: 'campaigns', title: 'Campaigns', intro: 'What we are pressing for and how it is going: cycle routes, junctions, council decisions, consultation responses and elections.' },
  { slug: 'meetings', title: 'Meetings', intro: 'Open meetings, annual general meetings and notes from the committee.' },
  { slug: 'rides-and-events', title: 'Rides and events', intro: 'Social rides, Bike Week and other events we have run or joined.' },
  { slug: 'stories', title: 'Stories and opinion', intro: 'People who ride in Portsmouth in their own words, and opinion from our members.' },
  { slug: 'guides', title: 'Guides', intro: 'Practical help: reporting problems, responding to planning applications, routes to ride and hiring a cargo bike.' },
  { slug: 'news', title: 'News', intro: 'Forum news, our newsletters and cycling news from elsewhere.' },
];

export const DEFAULT_SECTION = 'news';
export const getSection = (slug) => SECTIONS.find((section) => section.slug === slug) ?? null;

// The tags shown first on the topics page. Any tag not listed here still has
// its own page and appears in the full list.
export const TOPIC_GROUPS = [
  { title: 'Places and routes', tags: ['seafront', 'eastern-road', 'elm-grove', 'velder-ave', 'farlington-marshes', 'city-centre', 'cosham', 'hilsea', 'hayling', 'lakeside', 'cycle-routes'] },
  { title: 'What we campaign on', tags: ['a-city-to-share', 'elections', 'consultations', 'deputation', 'planning', 'safety', 'air-quality', 'cycle-parking', 'bike-hangars', 'barriers', 'traffic-lights', 'bike-theft', 'space-for-cycling', 'local-transport-plan', 'scrapbook'] },
  { title: 'People and community', tags: ['we-ride-portsmouth', 'women-cycling', 'family-cycling', 'cargo-bikes', 'rides', 'bike-week', 'open-meeting', 'agm', 'committee', 'newsletter', 'cyclenation'] },
];

// Tags that were merged into another, or became a section (those start with
// a slash). Their old pages send visitors on.
export const TAG_REDIRECTS = {
  campaigns: '/campaigns',
  meetings: '/meetings',
  events: '/rides-and-events',
  stories: '/stories',
  pcc: 'city-council',
  werideportsmouth: 'we-ride-portsmouth',
  'october-open-meeting': 'open-meeting',
  meeting: 'meetings',
  'committee-meeting': 'committee',
  election: 'elections',
  'local-elections': 'elections',
  routes: 'cycle-routes',
  'bike-route': 'cycle-routes',
  'bike-lane': 'cycle-routes',
  consultation: 'consultations',
  responses: 'consultations',
  'planning-application': 'planning',
  ride: 'rides',
  theft: 'bike-theft',
  crime: 'bike-theft',
  security: 'bike-theft',
  'crime-prevention': 'bike-theft',
  family: 'family-cycling',
  children: 'family-cycling',
  pollution: 'air-quality',
  dft: 'government',
  ltp: 'local-transport-plan',
  ltp4: 'local-transport-plan',
  accident: 'safety',
  legal: 'safety',
  'police-and-crime-commissioner': 'police',
  helmet: 'helmets',
  accounts: 'agm',
  strategy: 'a-city-to-share',
  'shared-use': 'shared-paths',
  permeability: 'barriers',
  parking: 'cycle-parking',
  'northern-quarter': 'city-centre',
};

// Addresses that an article or page may not take.
export const RESERVED = ['archive', 'tags', 'edit', 'api', 'feed', 'media', 'assets', 'img', 'css', 'js', 'todos', 'cleanup', ...SECTIONS.map((section) => section.slug)];
