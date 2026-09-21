import { Link } from 'react-router-dom';
import { Sparkles, Globe, MessageCircle, Mail } from 'lucide-react';

const columns = [
  {
    title: 'Product',
    links: ['How It Works', 'Voice Practice', 'Interview Practice', 'Analytics'],
  },
  {
    title: 'Company',
    links: ['About', 'Careers', 'Blog', 'Contact'],
  },
  {
    title: 'Resources',
    links: ['FAQ', 'Support', 'Privacy Policy', 'Terms of Service'],
  },
];

export function PublicFooter() {
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
              {[Globe, MessageCircle, Mail].map((Icon, i) => (
                <a key={i} href="#" className="flex size-9 items-center justify-center rounded-lg bg-base-800 text-base-300 transition-colors hover:bg-base-700 hover:text-base-50">
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-base-50">{col.title}</p>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-base-400 transition-colors hover:text-base-100">
                      {l}
                    </a>
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
