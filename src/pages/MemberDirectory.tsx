import { BriefcaseBusiness, HandHeart, MapPin, Search, ShieldCheck, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHero } from '../components/ui/PageHero';
import { members } from '../data/members';
import './MemberDirectory.css';

export function MemberDirectory() {
  const [query, setQuery] = useState('');
  const [memberType, setMemberType] = useState('All');
  const [helpArea, setHelpArea] = useState('All');

  const helpAreas = useMemo(
    () => Array.from(new Set(members.flatMap((member) => member.canHelpWith))).sort(),
    [],
  );

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return members.filter((member) => {
      const searchable = [
        member.fullName,
        member.occupation,
        member.organisation,
        member.country,
        member.region,
        ...member.skills,
        ...member.canHelpWith,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (memberType === 'All' || member.memberType === memberType) &&
        (helpArea === 'All' || member.canHelpWith.includes(helpArea))
      );
    });
  }, [helpArea, memberType, query]);

  const countries = new Set(members.map((member) => member.country)).size;
  const executives = members.filter((member) => member.memberType === 'Executive').length;
  const helpers = members.filter((member) => member.canHelpWith.length > 0).length;

  return (
    <>
      <PageHero
        eyebrow="Member Directory"
        title="Connect with the people who make our community stronger."
        text="Discover members by profession, skills, location and the support they are willing to offer. Personal contact details are only shown when a member has given consent."
      />

      <section className="section member-directory-section">
        <div className="member-stats-grid" aria-label="Member directory statistics">
          <article><Users size={24} /><strong>{members.length}</strong><span>Listed members</span></article>
          <article><ShieldCheck size={24} /><strong>{executives}</strong><span>Executive members</span></article>
          <article><MapPin size={24} /><strong>{countries}</strong><span>Countries represented</span></article>
          <article><HandHeart size={24} /><strong>{helpers}</strong><span>Members offering help</span></article>
        </div>

        <div className="directory-tools">
          <label className="directory-search">
            <Search size={20} />
            <span className="sr-only">Search members</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, profession, skill or country"
            />
          </label>

          <select value={memberType} onChange={(event) => setMemberType(event.target.value)} aria-label="Filter by member type">
            <option value="All">All members</option>
            <option value="Executive">Executive Committee</option>
            <option value="Member">General members</option>
          </select>

          <select value={helpArea} onChange={(event) => setHelpArea(event.target.value)} aria-label="Filter by how members can help">
            <option value="All">All help areas</option>
            {helpAreas.map((area) => <option key={area} value={area}>{area}</option>)}
          </select>
        </div>

        <div className="directory-results-heading">
          <div>
            <span className="eyebrow">Community Network</span>
            <h2>{filteredMembers.length} member{filteredMembers.length === 1 ? '' : 's'} found</h2>
          </div>
          <p>Sample profiles will be replaced with approved information submitted by members.</p>
        </div>

        {filteredMembers.length > 0 ? (
          <div className="member-card-grid">
            {filteredMembers.map((member) => (
              <article className="member-card" key={member.id}>
                <div className="member-avatar" aria-hidden="true">{member.initials}</div>
                <div className="member-card-copy">
                  <div className="member-card-topline">
                    <span>{member.memberType === 'Executive' ? member.executivePosition : 'Association Member'}</span>
                    <span>{member.country}</span>
                  </div>
                  <h3>{member.fullName}</h3>
                  <p className="member-occupation"><BriefcaseBusiness size={17} />{member.occupation}{member.organisation ? ` · ${member.organisation}` : ''}</p>
                  <p>{member.bio}</p>

                  <div className="member-tags" aria-label={`${member.fullName} skills`}>
                    {member.skills.slice(0, 3).map((skill) => <span key={skill}>{skill}</span>)}
                  </div>

                  <div className="member-help-box">
                    <strong><HandHeart size={17} />How I can help</strong>
                    <p>{member.canHelpWith.join(' · ')}</p>
                  </div>

                  <a className="button button-secondary" href={`#/members/${member.slug}`}>View profile</a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="directory-empty-state">
            <Search size={34} />
            <h3>No matching members found</h3>
            <p>Try a different name, profession, skill, country or help area.</p>
          </div>
        )}
      </section>
    </>
  );
}
