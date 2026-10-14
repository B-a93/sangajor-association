import { supabase } from './supabase';

export async function resolveMemberPhotoUrl(value: string | null | undefined) {
  if (!value) return null;
  if (/^(https?:\/\/|\/)/i.test(value)) return value;

  const { data, error } = await supabase.storage
    .from('member-profile-photos')
    .createSignedUrl(value, 60 * 60);

  return error ? null : data.signedUrl;
}
