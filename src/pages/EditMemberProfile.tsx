import { FormEvent, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import './EditMemberProfile.css';

type ProfileForm = {
  full_name: string;
  phone: string;
  whatsapp: string;
  occupation: string;
  organisation: string;
  country: string;
  city: string;
  biography: string;
  profile_visibility: 'public' | 'members' | 'private';
};

const emptyProfile: ProfileForm = { full_name: '', phone: '', whatsapp: '', occupation: '', organisation: '', country: '', city: '', biography: '', profile_visibility: 'members' };

export function EditMemberProfile() {
  const [session, setSession] = useState<Session | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyProfile);
  const [membershipId, setMembershipId] = useState('Pending assignment');
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadProfile() {
      const { data: authData } = await supabase.auth.getSession();
      const currentSession = authData.session;
      if (!currentSession) { window.location.hash = '/login'; return; }
      setSession(currentSession);

      const { data, error } = await supabase.from('profiles').select('*').eq('id', currentSession.user.id).maybeSingle();
      if (error) setMessage('Your profile could not be loaded. Apply the new Supabase migration first.');
      else if (data) {
        setForm({
          full_name: data.full_name ?? '', phone: data.phone ?? '', whatsapp: data.whatsapp ?? '', occupation: data.occupation ?? '',
          organisation: data.organisation ?? '', country: data.country ?? '', city: data.city ?? '', biography: data.biography ?? '',
          profile_visibility: data.profile_visibility ?? 'members',
        });
        setMembershipId(data.membership_id ?? 'Pending assignment');
        setStatus(data.membership_status ?? 'pending');
      } else setForm((current) => ({ ...current, full_name: currentSession.user.user_metadata.full_name ?? '' }));
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
    setSaving(true); setMessage('');
    const { error } = await supabase.from('profiles').upsert({ id: session.user.id, ...form, updated_at: new Date().toISOString() });
    setMessage(error ? error.message : 'Profile saved successfully.');
    setSaving(false);
  }

  if (loading) return <section className="profile-loading">Loading your profile…</section>;

  return (
    <section className="member-profile-page">
      <div className="profile-page-header">
        <div><p className="eyebrow">MySANGAJOR Digital Village</p><h1>My Member Profile</h1><p>Keep your information current so the Association can serve and connect members effectively.</p></div>
        <a className="secondary-button" href="#/dashboard">Back to dashboard</a>
      </div>

      <div className="membership-summary">
        <div><span>Membership ID</span><strong>{membershipId}</strong></div>
        <div><span>Membership status</span><strong className={`status status-${status}`}>{status}</strong></div>
        <div><span>Account email</span><strong>{session?.user.email}</strong></div>
      </div>

      <form className="profile-form" onSubmit={saveProfile}>
        <fieldset><legend>Personal and professional information</legend>
          <div className="profile-form-grid">
            <label>Full name<input required value={form.full_name} onChange={(e) => updateField('full_name', e.target.value)} /></label>
            <label>Phone number<input type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} /></label>
            <label>WhatsApp number<input type="tel" value={form.whatsapp} onChange={(e) => updateField('whatsapp', e.target.value)} /></label>
            <label>Occupation<input value={form.occupation} onChange={(e) => updateField('occupation', e.target.value)} /></label>
            <label>Company or organisation<input value={form.organisation} onChange={(e) => updateField('organisation', e.target.value)} /></label>
            <label>Country<input value={form.country} onChange={(e) => updateField('country', e.target.value)} /></label>
            <label>City or town<input value={form.city} onChange={(e) => updateField('city', e.target.value)} /></label>
            <label>Profile visibility<select value={form.profile_visibility} onChange={(e) => updateField('profile_visibility', e.target.value as ProfileForm['profile_visibility'])}><option value="public">Public</option><option value="members">Members only</option><option value="private">Private</option></select></label>
          </div>
          <label className="biography-field">Short biography<textarea rows={5} maxLength={600} value={form.biography} onChange={(e) => updateField('biography', e.target.value)} /><small>{form.biography.length}/600 characters</small></label>
        </fieldset>
        {message && <p className="profile-message" role="status">{message}</p>}
        <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
      </form>
    </section>
  );
}
