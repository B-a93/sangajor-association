export type MemberType = 'Executive' | 'Member';

export type MemberPrivacy = {
  showEmail: boolean;
  showPhone: boolean;
  showSocial: boolean;
  showBusiness: boolean;
};

export type Member = {
  id: string;
  slug: string;
  fullName: string;
  initials: string;
  memberType: MemberType;
  executivePosition?: string;
  occupation: string;
  organisation?: string;
  country: string;
  region?: string;
  bio: string;
  skills: string[];
  canHelpWith: string[];
  interests: string[];
  badges: string[];
  email?: string;
  phone?: string;
  social?: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };
  business?: {
    name: string;
    category: string;
    website?: string;
  };
  privacy: MemberPrivacy;
};
