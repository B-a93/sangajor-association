export type GalleryAlbum = {
  slug: string;
  title: string;
  category: string;
  date: string;
  photoCount: number;
  description: string;
  accent: 'navy' | 'green' | 'gold' | 'cream';
  featured?: boolean;
};

export const galleryCategories = [
  { name: 'Community Service', description: 'Volunteer activities and projects serving our communities.' },
  { name: 'School Visits', description: 'Moments shared with students, teachers and SANGAJOR B.C.S.' },
  { name: 'Annual General Meetings', description: 'Key decisions, reports and milestones from our general meetings.' },
  { name: 'Social Events', description: 'Reunions, celebrations and activities that strengthen friendship.' },
  { name: 'Project Legacy', description: 'Progress and stories connected to our long-term Legacy 2031 vision.' },
];

export const galleryAlbums: GalleryAlbum[] = [
  {
    slug: 'class-of-2008-reunion',
    title: 'Class of 2008 Reunion',
    category: 'Social Events',
    date: '2026-06-15',
    photoCount: 28,
    description: 'Members reconnecting, sharing memories and renewing the friendships formed at school.',
    accent: 'green',
    featured: true,
  },
  {
    slug: 'school-community-visit',
    title: 'School Community Visit',
    category: 'School Visits',
    date: '2026-05-24',
    photoCount: 19,
    description: 'A visit focused on listening, learning and strengthening our relationship with the school community.',
    accent: 'gold',
  },
  {
    slug: 'legacy-2031-planning',
    title: 'Project Legacy 2031 Planning',
    category: 'Project Legacy',
    date: '2026-04-18',
    photoCount: 16,
    description: 'Planning sessions dedicated to the Association’s long-term impact and sustainability goals.',
    accent: 'cream',
  },
  {
    slug: 'community-support-day',
    title: 'Community Support Day',
    category: 'Community Service',
    date: '2026-03-30',
    photoCount: 35,
    description: 'Members working together in service and demonstrating the strength of collective action.',
    accent: 'green',
  },
  {
    slug: 'general-members-meeting',
    title: 'General Members Meeting',
    category: 'Annual General Meetings',
    date: '2026-02-22',
    photoCount: 23,
    description: 'A member-centred meeting for updates, discussion and shared decision-making.',
    accent: 'navy',
  },
];
