export type EventItem = {
  slug: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  category: 'Meeting' | 'Community Service' | 'Fundraising' | 'Training' | 'Social';
  summary: string;
  status: 'upcoming' | 'past';
};

export type NewsItem = {
  slug: string;
  title: string;
  published: string;
  category: 'Association' | 'Leadership' | 'Membership' | 'Development';
  summary: string;
};

export const events: EventItem[] = [
  {
    slug: 'annual-general-meeting-2026',
    title: 'Annual General Meeting 2026',
    date: '2026-08-28',
    time: '10:00 AM',
    venue: 'SANGAJOR Basic Cycle School',
    category: 'Meeting',
    summary: 'Members will review progress, discuss the annual programme and agree on priorities supporting Project Legacy 2031.',
    status: 'upcoming',
  },
  {
    slug: 'school-community-service-day',
    title: 'School Community Service Day',
    date: '2026-09-19',
    time: '8:30 AM',
    venue: 'SANGAJOR Basic Cycle School',
    category: 'Community Service',
    summary: 'A practical service day bringing members together to support the school environment and strengthen community participation.',
    status: 'upcoming',
  },
  {
    slug: 'executive-planning-session',
    title: 'Executive Planning Session',
    date: '2026-07-12',
    time: '7:00 PM',
    venue: 'Online',
    category: 'Meeting',
    summary: 'The Executive Committee reviewed the digital platform, membership engagement and the first-year work programme.',
    status: 'past',
  },
];

export const news: NewsItem[] = [
  {
    slug: 'about-page-launched',
    title: 'Professional About page added to the Association platform',
    published: '2026-07-29',
    category: 'Development',
    summary: 'The website now presents the Association story, mission, vision, values, objectives and Project Legacy 2031 in one dedicated section.',
  },
  {
    slug: 'leadership-profiles-published',
    title: 'Executive leadership profiles continue to be published',
    published: '2026-07-24',
    category: 'Leadership',
    summary: 'Completed profiles are available on the leadership page while outstanding information is collected from remaining officers.',
  },
  {
    slug: 'membership-information-drive',
    title: 'Membership information and photograph collection underway',
    published: '2026-07-22',
    category: 'Membership',
    summary: 'Members are being invited to submit accurate information and consent before personal details are published on the platform.',
  },
];
