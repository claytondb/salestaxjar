import Link from 'next/link';
import SailsLogo from '@/components/SailsLogo';
import ThemeToggle from '@/components/ThemeToggle';

type Section = 'free-scan' | 'pricing' | 'calculator' | 'blog';

const NAV: { id: Section; href: string; label: string }[] = [
  { id: 'free-scan', href: '/free-scan', label: 'Free Nexus Check' },
  { id: 'pricing', href: '/pricing', label: 'Pricing' },
  { id: 'calculator', href: '/free-calculator', label: 'Calculator' },
  { id: 'blog', href: '/blog', label: 'Blog' },
];

/** Header for public pages: logo, main links, theme toggle, log in and sign up. */
export default function MarketingHeader({ active }: { active?: Section }) {
  return (
    <header className="border-b border-theme-primary bg-transparent backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <SailsLogo className="w-10 h-10 text-theme-accent" />
            <span className="text-2xl font-bold text-theme-primary">Sails</span>
          </Link>
          <nav className="hidden lg:flex gap-6 items-center" aria-label="Main">
            {NAV.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active === item.id ? 'page' : undefined}
                className={
                  active === item.id
                    ? 'text-theme-accent font-medium'
                    : 'text-theme-secondary hover:text-theme-primary transition'
                }
              >
                {item.label}
              </Link>
            ))}
            <ThemeToggle />
          </nav>
          <div className="flex gap-2 sm:gap-3 items-center">
            <div className="hidden sm:block lg:hidden">
              <ThemeToggle />
            </div>
            <Link href="/login" className="text-theme-secondary hover:text-theme-primary px-3 py-2 transition whitespace-nowrap">
              Log in
            </Link>
            <Link href="/signup" className="btn-theme-primary px-3 sm:px-4 py-2 rounded-lg font-medium transition whitespace-nowrap">
              Start Free
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
