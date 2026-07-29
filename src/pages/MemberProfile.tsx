import { ArrowLeft, BriefcaseBusiness, HandHeart, Heart, MapPin, ShieldCheck } from 'lucide-react';
import type { Member } from '../types/member';
import './MemberDirectory.css';

type MemberProfileProps = {
  member: Member;
};

export function MemberProfile({ member }: MemberProfileProps) {
  return (
    <section className="section member-profile-section">
      <a className="member-profile-back" href="#/members"><ArrowLeft size={18} />Back to Member Directory</a>

      <div className="member-profile-hero">
        <div className="member-profile-avatar" aria-hidden="true">{member.initials}</div>
        <div>
          <span className="eyebrow">{member.memberType === 'Executive' ? member.executivePosition : 'Association Member'}</span>
          <h1>{member.fullName}</h1>
          <p className="member-profile-role"><BriefcaseBusiness size={19} />{member.occupation}{member.organisation ? ` · ${member.organisation}` : ''}</p>
          <p className="member-profile-location"><MapPin size={18} />{[member.region, member.country].filter(Boolean).join(', ')}</p>
          <div className="member-tags profile-badges">
            {member.badges.map((badge) => <span key={badge}>{badge}</span>)}
          </div>
        </div>
      </div>

      <div className="member-profile-grid">
        <article className="member-profile-panel member-profile-main">
          <span className="eyebrow">My Story</span>
          <h2>About {member.fullName}</h2>
          <p>{member.bio}</p>

          <div className="profile-detail-section">
            <h3>Skills and expertise</h3>
            <div className="member-tags">
              {member.skills.map((skill) => <span key={skill}>{skill}</span>)}
            </div>
          </div>

          <div className="profile-detail-section">
            <h3><HandHeart size={20} />How I can help</h3>
            <div className="member-tags help-tags">
              {member.canHelpWith.map((area) => <span key={area}>{area}</span>)}
            </div>
          </div>

          <div className="profile-detail-section">
            <h3><Heart size={20} />Interests</h3>
            <p>{member.interests.join(' · ')}</p>
          </div>
        </article>

        <aside className="member-profile-panel privacy-panel">
          <ShieldCheck size={30} />
          <h2>Privacy respected</h2>
          <p>This profile only displays information approved for public use by the member.</p>
          {member.business && member.privacy.showBusiness ? (
            <div className="profile-business">
              <span className="eyebrow">Member Business</span>
              <strong>{member.business.name}</strong>
              <p>{member.business.category}</p>
            </div>
          ) : null}
          {!member.privacy.showEmail && !member.privacy.showPhone ? (
            <p className="privacy-note">Private contact details are not publicly displayed.</p>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
