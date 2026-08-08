import { FormEvent, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import './EditMemberProfile.css';

type ProfileForm = {
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  phone: string;
  email: string;
  address: string;
  country: string;
  occupation: string;
  profile_photo: string;
};

const emptyProfile: ProfileForm = {
  first_name: '',
  last_name: '',
  gender: '',
  date_of_birth: '',
  phone: '',
  email: '',
  address: '',
  country: '',
  occupation: '',
  profile_photo: '',
};

export function EditMemberProfile() {
  const [session, setSession] = useState<Session | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyProfile);
  const [membershipNumber, setMembershipNumber] = useState('Pending assignment');
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [memberId, setMemberId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: authData } = await supabase.auth.getSession();
      const currentSession = authData.session;

      if (!currentSession) {
        window.location.hash = '/login';
        return;
      }

      setSession(currentSession);

      const { data, error } = await supabase
        .from('Members')
        .select('id, membership_number, first_name, last_name, gender, date_of_birth, phone, email, address, country, occupation, profile_photo, status')
        .eq('auth_user_id', currentSession.user.id)
        .maybeSingle();

      if (error) {
        setMessage('Your member profile could not be loaded. Please try again.');
      } else if (data) {
        setMemberId(data.id);
        setForm({
          first_name: data.first_name ?? '',
          last_name: data.last_name ?? '',
          gender: data.gender ?? '',
          date_of_birth: data.date_of_birth ?? '',
          phone: data.phone ?? '',
          email: data.email ?? currentSession.user.email ?? '',
          address: data.address ?? '',
          country: data.country ?? '',
          occupation: data.occupation ?? '',
          profile_photo: data.profile_photo ?? '',
        });
        setMembershipNumber(data.membership_number ?? 'Pending assignment');
        setStatus(data.status ?? 'pending');
      } else {
        const metadata = currentSession.user.user_metadata;
        setForm((current) => ({
          ...current,
          first_name: metadata.first_name ?? '',
          last_name: metadata.last_name ?? '',
          email: currentSession.user.email ?? '',
        }));
      }

      setLoading(false);
    }

    void loadProfile();
  }, []);

  function updateField<K extends keyof ProfileForm>(field: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!session) return;

    setSaving(true);
    setMessage('');

    let profilePhoto = form.profile_photo;
    if (photo) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 5 * 1024 * 1024) {
        setMessage('Choose a JPG, PNG or WebP photograph under 5 MB.'); setSaving(false); return;
      }
      const extension = photo.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${session.user.id}/profile.${extension}`;
      const { error: uploadError } = await supabase.storage.from('member-profile-photos').upload(path, photo, { upsert: true });
      if (uploadError) { setMessage('Your profile photograph could not be uploaded.'); setSaving(false); return; }
      profilePhoto = supabase.storage.from('member-profile-photos').getPublicUrl(path).data.publicUrl;
    }

    const payload = {
      auth_user_id: session.user.id,
      ...form,
      profile_photo: profilePhoto,
      updated_at: new Date().toISOString(),
    };

    const query = memberId
      ? supabase.from('Members').update(payload).eq('id', memberId)
      : supabase.from('Members').insert(payload).select('id').single();

    const { data, error } = await query;

    if (error) {
      setMessage(error.message);
    } else {
      if (!memberId && data && 'id' in data) setMemberId(data.id as string);
      setMessage('Profile saved successfully.');
      setForm((current) => ({ ...current, profile_photo: profilePhoto })); setPhoto(null);
    }

    setSaving(false);
  }

  if (loading) return <section className="profile-loading">Loading your profile…</section>;

  return (
    <section className="member-profile-page">
      <div className="profile-page-header">
        <div>
          <p className="eyebrow">MySANGAJOR Digital Village</p>
          <h1>My Member Profile</h1>
          <p>Keep your information current so the Association can serve and connect members effectively.</p>
        </div>
        <a className="secondary-button" href="#/dashboard">Back to dashboard</a>
      </div>

      <div className="membership-summary">
        <div><span>Membership number</span><strong>{membershipNumber}</strong>{membershipNumber === 'Pending assignment' && <small>Assigned by an authorized executive after registration.</small>}</div>
        <div><span>Membership status</span><strong className={`status status-${status}`}>{status}</strong></div>
        <div><span>Account email</span><strong>{session?.user.email}</strong></div>
      </div>

      <form className="profile-form" onSubmit={saveProfile}>
        <fieldset className="profile-photo-fieldset"><legend>Profile photograph</legend><div className="profile-photo-editor">{form.profile_photo ? <img src={form.profile_photo} alt="Current member profile"/> : <div aria-hidden="true">{form.first_name?.[0] || 'M'}{form.last_name?.[0] || ''}</div>}<label>Upload a clear photograph<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}/><small>JPG, PNG or WebP. Maximum 5 MB.</small></label></div></fieldset>
        <fieldset>
          <legend>Personal information</legend>
          <div className="profile-form-grid">
            <label>First name<input required value={form.first_name} onChange={(event) => updateField('first_name', event.target.value)} /></label>
            <label>Last name<input required value={form.last_name} onChange={(event) => updateField('last_name', event.target.value)} /></label>
            <label>Gender<select value={form.gender} onChange={(event) => updateField('gender', event.target.value)}><option value="">Select gender</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option></select></label>
            <label>Date of birth<input type="date" value={form.date_of_birth} onChange={(event) => updateField('date_of_birth', event.target.value)} /></label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Contact and professional information</legend>
          <div className="profile-form-grid">
            <label>Phone number<input type="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} /></label>
            <label>Email address<input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} /></label>
            <label>Country<input value={form.country} onChange={(event) => updateField('country', event.target.value)} /></label>
            <label>Occupation<input value={form.occupation} onChange={(event) => updateField('occupation', event.target.value)} /></label>
          </div>
          <label className="biography-field">Address<textarea rows={4} value={form.address} onChange={(event) => updateField('address', event.target.value)} /></label>
        </fieldset>

        {message && <p className="profile-message" role="status">{message}</p>}
        <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
      </form>
    </section>
  );
}
