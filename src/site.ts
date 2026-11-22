// Central site / contact config. Change links here, not in pages.
export const SITE = {
  name: 'Giulliano Amaral',
  handle: 'giuskywalker',
  title: 'Giulliano Amaral — Offensive Security',
  description:
    'Giulliano Amaral — penetration tester and offensive security researcher. Web, API, Active Directory and AI/LLM security assessments, plus writeups and research.',
  location: 'Rio de Janeiro, Brazil',
  email: 'giuskywalker@pm.me',
  // Booking link (Cal.com / Calendly). Empty = "Book a call" falls back to an e-mail request.
  bookingUrl: 'https://cal.com/giullianoamaral',
};

export const SOCIALS = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/giulliano-amaral/' },
  { label: 'GitHub', href: 'https://github.com/giuskywalkerxyz' },
  { label: 'YouTube', href: 'https://www.youtube.com/@giullianoamaralsec' },
  { label: 'HackTheBox', href: 'https://app.hackthebox.com/users/768648' },
  { label: 'TryHackMe', href: 'https://tryhackme.com/p/giuskywalker' },
];

export const mailto = (subject: string, body = '') =>
  `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`;

export const bookingHref = () =>
  SITE.bookingUrl ||
  mailto(
    'Call request',
    'Hi Giulliano,\n\nI would like to book a 30-minute call to discuss a security assessment.\n\nCompany:\nPreferred dates/times (with timezone):\nTopic:\n'
  );

export const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
