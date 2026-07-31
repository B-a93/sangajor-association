export type Executive = {
  slug: string;
  name: string;
  role: string;
  image?: string;
  location?: string;
  occupation?: string;
  organisation?: string;
  bio?: string;
  reason?: string;
  vision?: string;
  motto?: string;
  skills?: string[];
  email?: string;
  facebook?: string;
  status: 'complete' | 'pending';
};
