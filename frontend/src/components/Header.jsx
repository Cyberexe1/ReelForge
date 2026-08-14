import { Link, NavLink } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/studio', label: 'Studio' },
];

function BrandMark() {
  return (
    <Link
      to="/"
      className="rf-focus group flex items-center gap-2.5 rounded-full py-1 pr-2"
      aria-label="REELFORGE home"
    >
      <span className="relative flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-forge to-ember shadow-lg shadow-ember/20">
        <span className="size-2.5 rounded-full bg-ink transition-transform duration-300 group-hover:scale-125" />
      </span>
      <span className="text-[15px] font-bold tracking-[0.16em] text-chalk">REELFORGE</span>
    </Link>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 pt-4 pb-2">
      <div className="rf-shell">
        <nav
          aria-label="Main"
          className="flex items-center justify-between gap-3 rounded-[26px] border border-line/80 bg-surface/60 px-3 py-2.5 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:px-4"
        >
          <BrandMark />

          <ul className="hidden items-center gap-1 sm:flex">
            {NAV_LINKS.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    [
                      'rf-focus block rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200',
                      isActive
                        ? 'bg-surface-2 text-chalk'
                        : 'text-mist hover:bg-surface-2/60 hover:text-chalk',
                    ].join(' ')
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          <Link
            to="/studio"
            className="rf-focus rounded-full bg-chalk px-4 py-2 text-sm font-semibold text-ink transition-colors duration-200 hover:bg-forge sm:px-5"
          >
            Create movie
          </Link>
        </nav>
      </div>
    </header>
  );
}
