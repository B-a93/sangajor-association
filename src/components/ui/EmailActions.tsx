import { useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, Mail } from 'lucide-react';
import './EmailActions.css';

type EmailActionsProps = {
  email: string;
  subject?: string;
  body?: string;
  compact?: boolean;
  inverse?: boolean;
};

function composeUrl(provider: 'gmail' | 'outlook', email: string, subject = '', body = '') {
  const params = new URLSearchParams({
    to: email,
    subject,
    body,
  });

  return provider === 'gmail'
    ? `https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`
    : `https://outlook.office.com/mail/deeplink/compose?${params.toString()}`;
}

export function EmailActions({
  email,
  subject = '',
  body = '',
  compact = false,
  inverse = false,
}: EmailActionsProps) {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={`email-actions${compact ? ' compact' : ''}${inverse ? ' inverse' : ''}`}>
      <a
        href={composeUrl('gmail', email, subject, body)}
        target="_blank"
        rel="noreferrer"
        aria-label={`Reply to ${email} using Gmail`}
      >
        <Mail size={16} />
        Gmail
        <ExternalLink size={13} aria-hidden="true" />
      </a>
      <a
        href={composeUrl('outlook', email, subject, body)}
        target="_blank"
        rel="noreferrer"
        aria-label={`Reply to ${email} using Outlook`}
      >
        <Mail size={16} />
        Outlook
        <ExternalLink size={13} aria-hidden="true" />
      </a>
      <button type="button" onClick={copyEmail} aria-label={`Copy ${email}`}>
        {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
        {copied ? 'Copied' : 'Copy email'}
      </button>
      <a href={`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>
        <Mail size={16} />
        Email app
      </a>
    </div>
  );
}
