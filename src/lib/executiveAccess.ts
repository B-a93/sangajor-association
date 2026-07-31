export const executiveRoles = [
  'chairman', 'vice_chairperson', 'secretary_general', 'assistant_secretary_general',
  'treasurer', 'assistant_treasurer', 'auditor_general', 'assistant_auditor_general',
  'ipro', 'assistant_ipro', 'programme_officer', 'assistant_programme_officer', 'adviser', 'admin',
] as const;

export type AppRole = 'member' | (typeof executiveRoles)[number];

export type AuthenticatedProfile = {
  id: string;
  full_name: string;
  email: string | null;
  membership_number: string | null;
  role: AppRole;
  is_active: boolean;
};

export function isActiveExecutive(profile: AuthenticatedProfile | null): boolean {
  return Boolean(profile?.is_active && executiveRoles.includes(profile.role as (typeof executiveRoles)[number]));
}

export function roleLabel(role: AppRole): string {
  const labels: Partial<Record<AppRole, string>> = {
    ipro: 'Information & Public Relations Officer',
    assistant_ipro: 'Assistant Information & Public Relations Officer',
  };
  return labels[role] ?? role.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
