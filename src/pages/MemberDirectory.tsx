import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import './MemberDirectory.css';

type DirectoryMember = {
  id: string;
  membership_number: string | null;
  first_name: string | null;
  last_name: string | null;
  country: string | null;
  occupation: string | null;
  profile_photo: string | null;
  status: string | null;
};

export function MemberDirectory() {
  const [session, setSession] = useState<Session | null>(null);
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadDirectory() {
      const { data: authData } = await supabase.auth.getSession();
      const currentSession = authData.session;

      if (!currentSession) {
        window.location.hash = '/login';
        return;
      }

      setSession(currentSession);

      const { data, error } = await supabase
        .from('members')
        .select('id, membership_number, first_name, last_name, country, occupation, profile_photo, status')
        .eq('status', 'active')
        .order('first_name', { ascending: true })
        .order('last_name', { ascending: true });

      if (error) setMessage('The member directory could not be loaded. Please try again.');
      else setMembers(data ?? []);

      setLoading(false);
    }

    void loadDirectory();
  }, []);

  const visibleMembers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return members;

    return members.filter((member) => [
      member.membership_number,
      member.first_name,
      member.last_name,
      member.country,
      member.occupation,
    ].filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [members, search]);

  if (loading || !session) return <section className="directory-loading">Loading the member directory…</section>;

  return (
    <section className="member-directory-page">
      <div className="directory-header">
        <div>
          <p className="eyebrow">MySANGAJOR Digital Village</p>
          <h1>Member Directory</h1>
          <p>Find and connect with active members of the SANGAJOR B.C.S. Class of 2008 Association.</p>
        </div>
        <a className="secondary-button" href="#/dashboard">Back to dashboard</a>
      </div>

      <div className="directory-toolbar">
        <label htmlFor="member-search">Search members</label>
        <input
          id="member-search"
          type="search"
          placeholder="Search by name, country, occupation or membership number"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <span>{visibleMembers.length} member{visibleMembers.length === 1 ? '' : 's'} found</span>
      </div>

      {message && <p className="directory-message" role="alert">{message}</p>}

      {!message && visibleMembers.length === 0 ? (
        <div className="directory-empty">
          <h2>No members found</h2>
          <p>{search ? 'Try a different search term.' : 'Active members will appear here once their profiles are available.'}</p>
        </div>
      ) : (
        <div className="directory-grid">
          {visibleMembers.map((member) => {
            const fullName = `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim() || 'Association member';
            const initials = `${member.first_name?.[0] ?? ''}${member.last_name?.[0] ?? ''}`.toUpperCase() || 'SM';

            return (
              <article className="directory-member-card" key={member.id}>
                {member.profile_photo ? (
                  <img src={member.profile_photo} alt={`${fullName} profile`} loading="lazy" decoding="async" />
                ) : (
                  <div className="directory-member-initials" aria-hidden="true">{initials}</div>
                )}
                <div className="directory-member-content">
                  <span className="directory-member-number">{member.membership_number || 'Membership number pending'}</span>
                  <h2>{fullName}</h2>
                  <p>{member.occupation || 'Occupation not provided'}</p>
                  <small>{member.country || 'Country not provided'}</small>
                  <a className="directory-profile-link" href={`#/dashboard/members/${member.id}`}>View profile</a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
