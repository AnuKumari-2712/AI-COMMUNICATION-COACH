import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Mail } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

type FooterLink = { label: string; to?: string; comingSoon?: boolean };

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'How It Works', to: '/#how-it-works' },
      { label: 'Voice Practice', to: '/app/practice/voice' },
      { label: 'Interview Practice', to: '/app/interview' },
      { label: 'Analytics', to: '/app/analytics' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', comingSoon: true },
      { label: 'Careers', comingSoon: true },
      { label: 'Blog', comingSoon: true },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'FAQ', to: '/#faq' },
      { label: 'Support', to: '/app/coach' },
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
    ],
  },
];

export function PublicFooter() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleClick = (link: FooterLink) => {
    if (link.to) {
      navigate(link.to);
      return;
    }
    showToast({ title: `${link.label} — coming soon`, description: 'This page is still being written.', variant: 'info' });
  };

  // In-page anchors (landing page sections) need a plain <a href="#..."> for
  // native browser smooth-scroll — react-router's navigate() changes the URL
  // hash without actually scrolling to it.
  const isSamePageAnchor = (to?: string) => to?.startsWith('/#');

  return (
    <footer className="border-t border-white/5 bg-base-950">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-azure-500">
                <Sparkles className="size-4 text-white" />
              </div>
              <span className="font-display text-sm font-semibold text-base-50">Communication Coach</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-base-400">
              An adaptive AI platform that helps students and candidates build stronger communication and interview skills.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a
                href="mailto:hello@communicationcoach.app"
                aria-label="Email us"
                className="flex size-9 items-center justify-center rounded-lg bg-base-800 text-base-300 transition-colors hover:bg-base-700 hover:text-base-50"
              >
                <Mail className="size-4" />
              </a>
            </div>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-base-50">{col.title}</p>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {isSamePageAnchor(link.to) ? (
                      <a href={link.to!.slice(1)} className="text-sm text-base-400 transition-colors hover:text-base-100">
                        {link.label}
                      </a>
                    ) : (
                      <button onClick={() => handleClick(link)} className="text-sm text-base-400 transition-colors hover:text-base-100">
                        {link.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs text-base-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Communication Coach. All rights reserved.</p>
          <p>Built for students, universities and interview candidates.</p>
        </div>
      </div>
    </footer>
  );
}
