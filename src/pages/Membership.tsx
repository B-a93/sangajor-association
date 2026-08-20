import { ArrowRight, LockKeyhole } from 'lucide-react';
import { PageHero } from '../components/ui/PageHero';
import { reasonsToJoin } from '../data/site';
import './Membership.css';

export function Membership() {
  return (
    <>
      <PageHero
        eyebrow="Membership"
        title="Belong to the community you helped create."
        text="Membership reconnects classmates, strengthens mutual support and gives every member a voice in the future of the SANGAJOR B.C.S. Class of 2008 Association."
      />

      <section className="section membership-benefits-section">
        <div className="section-heading">
          <span className="eyebrow">Membership Benefits</span>
          <h2>More than belonging — a community that supports you</h2>
          <p>Members gain access to friendships, opportunities and secure services designed to help classmates connect, contribute and support one another.</p>
        </div>

        <div className="card-grid membership-benefits-grid">
          {reasonsToJoin.map(({ icon: Icon, title, text }) => (
            <article className="impact-card" key={title}>
              <div className="icon-wrap"><Icon /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="membership-private-note">
        <div>
          <span className="eyebrow light">Members-Only Privacy</span>
          <h2>Your member information stays within the Association</h2>
          <p>The Member Directory, business network, skills directory, welfare services and future MySANGAJOR tools will only be available to approved members after secure sign-in.</p>
        </div>
        <LockKeyhole size={48} aria-hidden="true" />
      </section>

      <section className="section membership-join-section">
        <div className="membership-join-card">
          <div>
            <span className="eyebrow">Become a Member</span>
            <h2>Join the SANGAJOR Class of 2008 community</h2>
            <p>Membership is intended for eligible members of the SANGAJOR B.C.S. Class of 2008. Submit your interest and the Association will guide you through the membership process.</p>
          </div>
          <a className="button membership-join-button" href="#/contact">
            Join Our Membership <ArrowRight size={18} />
          </a>
        </div>
      </section>
    </>
  );
}
