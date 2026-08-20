import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Mail, MessageSquareText, Phone, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './ContactEnquiries.css';

type EnquiryStatus = 'new' | 'in_progress' | 'resolved' | 'spam';

type ContactEnquiry = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  subject: string;
  message: string;
  status: EnquiryStatus;
  created_at: string;
  reviewed_at: string | null;
};

const statusLabels: Record<EnquiryStatus, string> = {
  new: 'New',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  spam: 'Spam',
};

export function ContactEnquiries() {
  const [enquiries, setEnquiries] = useState<ContactEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [notice, setNotice] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  useEffect(() => {
    async function loadEnquiries() {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) {
        window.location.hash = '/login';
        return;
      }

      const permission = await supabase.rpc('can_manage_contact_enquiries');
      if (permission.error || !permission.data) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      setAllowed(true);
      const result = await supabase
        .from('contact_messages')
        .select('id, full_name, email, phone, subject, message, status, created_at, reviewed_at')
        .order('created_at', { ascending: false });

      if (result.error) setNotice('Contact enquiries could not be loaded. Please try again.');
      else setEnquiries((result.data ?? []) as ContactEnquiry[]);
      setLoading(false);
    }

    void loadEnquiries();
  }, []);

  const counts = useMemo(() => ({
    new: enquiries.filter((item) => item.status === 'new').length,
    inProgress: enquiries.filter((item) => item.status === 'in_progress').length,
    resolved: enquiries.filter((item) => item.status === 'resolved').length,
  }), [enquiries]);

  async function updateStatus(id: string, status: EnquiryStatus) {
    setUpdatingId(id);
    setNotice('');

    const result = await supabase
      .from('contact_messages')
      .update({
        status,
        reviewed_at: status === 'new' ? null : new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, full_name, email, phone, subject, message, status, created_at, reviewed_at')
      .single();

    setUpdatingId('');
    if (result.error) {
      setNotice('The enquiry status could not be updated. Please try again.');
      return;
    }

    setEnquiries((current) => current.map((item) => (
      item.id === id ? result.data as ContactEnquiry : item
    )));
  }

  if (loading) {
    return <section className="contact-enquiries-state">Loading contact enquiries…</section>;
  }

  if (!allowed) {
    return (
      <section className="contact-enquiries-state" role="alert">
        <ShieldAlert size={42} />
        <h1>Contact inbox unavailable</h1>
        <p>This inbox is limited to the active IPRO and Secretariat offices.</p>
        <a href="#/dashboard">Return to dashboard</a>
      </section>
    );
  }

  return (
    <section className="contact-enquiries-page">
      <header className="contact-enquiries-header">
        <div>
          <p className="eyebrow">IPRO &amp; Secretariat</p>
          <h1>Contact Enquiries</h1>
          <p>Review public website messages, follow up through the supplied contact information and record their progress.</p>
        </div>
        <a className="secondary-button" href="#/dashboard">Return to dashboard</a>
      </header>

      <div className="contact-enquiry-summary">
        <article><MessageSquareText /><span>New</span><strong>{counts.new}</strong></article>
        <article><Clock3 /><span>In Progress</span><strong>{counts.inProgress}</strong></article>
        <article><CheckCircle2 /><span>Resolved</span><strong>{counts.resolved}</strong></article>
      </div>

      {notice && <p className="contact-enquiries-notice" role="alert">{notice}</p>}

      <div className="contact-enquiries-list">
        {enquiries.length === 0 ? (
          <div className="contact-enquiries-empty">
            <MessageSquareText size={38} />
            <h2>No enquiries yet</h2>
            <p>New messages submitted through the public Contact page will appear here.</p>
          </div>
        ) : enquiries.map((enquiry) => (
          <article className="contact-enquiry-card" key={enquiry.id}>
            <div className="contact-enquiry-card-heading">
              <div>
                <span className={`contact-enquiry-status ${enquiry.status}`}>{statusLabels[enquiry.status]}</span>
                <h2>{enquiry.subject}</h2>
                <p>From <strong>{enquiry.full_name}</strong> · {new Date(enquiry.created_at).toLocaleString()}</p>
              </div>
              <label>
                Update status
                <select
                  value={enquiry.status}
                  disabled={updatingId === enquiry.id}
                  onChange={(event) => void updateStatus(enquiry.id, event.target.value as EnquiryStatus)}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option value={value} key={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>

            <p className="contact-enquiry-message">{enquiry.message}</p>

            <div className="contact-enquiry-details">
              {enquiry.email && (
                <a href={`mailto:${enquiry.email}`}><Mail size={17} />{enquiry.email}</a>
              )}
              {enquiry.phone && (
                <a href={`tel:${enquiry.phone}`}><Phone size={17} />{enquiry.phone}</a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
