import { useState, type FormEvent } from 'react';
import { CheckCircle2, Clock3, Copy, Mail, MapPin, Send, Users } from 'lucide-react';
import { PageHero } from '../components/ui/PageHero';
import { supabase } from '../lib/supabase';
import './Contact.css';
import { associationEmail } from '../config/site';

type ContactForm = {
  fullName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  website: string;
};

const emptyForm: ContactForm = {
  fullName: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
  website: '',
};

export function Contact() {
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState<'success' | 'error' | ''>('');
  const [emailCopied, setEmailCopied] = useState(false);

  const updateField = (field: keyof ContactForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(associationEmail);
      setEmailCopied(true);
      window.setTimeout(() => setEmailCopied(false), 2500);
    } catch {
      setEmailCopied(false);
    }
  };

  const submitContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice('');
    setNoticeType('');

    if (form.website) {
      setNotice('Thank you. Your message has been received.');
      setNoticeType('success');
      setForm(emptyForm);
      return;
    }

    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const subject = form.subject.trim();
    const message = form.message.trim();

    if (fullName.length < 2 || subject.length < 3 || message.length < 10) {
      setNotice('Please complete your name, subject and a message of at least 10 characters.');
      setNoticeType('error');
      return;
    }

    if (!email && !phone) {
      setNotice('Please provide an email address or phone number so we can respond.');
      setNoticeType('error');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('contact_messages').insert({
      full_name: fullName,
      email: email || null,
      phone: phone || null,
      subject,
      message,
    });
    setSubmitting(false);

    if (error) {
      setNotice('Your message could not be sent. Please email the Association directly or try again.');
      setNoticeType('error');
      return;
    }

    setNotice('Thank you. Your message has been sent to the Association.');
    setNoticeType('success');
    setForm(emptyForm);
  };

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Connect with SANGAJOR."
        text="Questions about membership, partnerships or the Association can be directed through the official channels below."
      />

      <section className="section contact-section">
        <div className="contact-grid">
          <article>
            <Mail />
            <h3>Email</h3>
            <a className="contact-email-link" href={`mailto:${associationEmail}`}>{associationEmail}</a>
            <button className="copy-email-button" type="button" onClick={copyEmail}>
              {emailCopied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              {emailCopied ? 'Email copied' : 'Copy email'}
            </button>
          </article>
          <article>
            <MapPin />
            <h3>Community</h3>
            <p>The Gambia and members around the world.</p>
          </article>
          <article>
            <Users />
            <h3>Membership</h3>
            <a href="https://forms.gle/xdcesGiV6nWmDwPs7" target="_blank" rel="noreferrer">Open registration form</a>
          </article>
        </div>

        <div className="contact-form-layout">
          <div>
            <span className="eyebrow">Send an Enquiry</span>
            <h2>Contact the Association directly</h2>
            <p>Use this form if an email application does not open on your device. Your enquiry will be stored securely for the Association to review.</p>
          </div>

          <form className="contact-form" onSubmit={submitContact}>
            <div className="contact-form-grid">
              <label>
                Full name
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                  value={form.fullName}
                  onChange={(event) => updateField('fullName', event.target.value)}
                />
              </label>
              <label>
                Email address
                <input
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                />
              </label>
              <label>
                Phone or WhatsApp number
                <input
                  type="tel"
                  maxLength={40}
                  autoComplete="tel"
                  placeholder="+220..."
                  value={form.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                />
              </label>
              <label>
                Subject
                <input
                  required
                  minLength={3}
                  maxLength={160}
                  value={form.subject}
                  onChange={(event) => updateField('subject', event.target.value)}
                />
              </label>
            </div>

            <label>
              Message
              <textarea
                required
                minLength={10}
                maxLength={3000}
                rows={7}
                value={form.message}
                onChange={(event) => updateField('message', event.target.value)}
              />
            </label>

            <label className="contact-honeypot" aria-hidden="true">
              Website
              <input
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(event) => updateField('website', event.target.value)}
              />
            </label>

            <p className="contact-form-help">Please provide either an email address or phone number.</p>
            {notice && <p className={`contact-notice ${noticeType}`} role="status">{notice}</p>}

            <button className="button contact-submit-button" type="submit" disabled={submitting}>
              <Send size={18} />
              {submitting ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </div>

        <aside className="response-time-note">
          <div className="response-time-icon"><Clock3 size={27} /></div>
          <div>
            <span className="eyebrow">Response Time</span>
            <h2>We aim to respond within 2–3 business days.</h2>
            <p>Our team aims to respond to all enquiries within 2–3 business days. We appreciate your patience and look forward to assisting you.</p>
          </div>
        </aside>
      </section>
    </>
  );
}
