import pathlib

p = pathlib.Path('src/components/Navbar.tsx')
t = p.read_text(encoding='utf-8')
edits = []

# 1. icons for the hamburger
t = t.replace("""    Settings,
    Trophy
  } from 'lucide-react';""",
"""    Settings,
    Trophy,
    Menu,
    X,
  } from 'lucide-react';""")
edits.append('icons')

# 2. the landing links, defined once so the desktop nav and the mobile panel
#    cannot drift apart
anchor = "interface NavbarProps {"
assert t.count(anchor) == 1
t = t.replace(anchor, """/**
 * Landing-page anchor links. Defined once and rendered twice (desktop bar and
 * mobile panel) so the two can never drift apart.
 */
const LANDING_LINKS = [
  { href: '#product', label: 'Product' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#pricing', label: 'Pricing' },
];

interface NavbarProps {""", 1)
edits.append('link list')

# 3. state for the mobile menu
t = t.replace("""  const [bizDropdownOpen, setBizDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);""",
"""  const [bizDropdownOpen, setBizDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);""")
edits.append('mobile state')

# 4. close the mobile menu on resize to desktop, and whenever the view changes
old_effect = """    // Close dropdowns on outside click
    useEffect(() => {"""
new_effect = """    /*
      The mobile panel is only meaningful while the bar is narrow. Without this
      it stays open (and overlays the page) if the window is widened or the
      device is rotated to landscape.
    */
    useEffect(() => {
      function handleResize() {
        if (window.innerWidth >= 1024) setMobileMenuOpen(false);
      }
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Close dropdowns on outside click
    useEffect(() => {"""
assert t.count(old_effect) == 1
t = t.replace(old_effect, new_effect, 1)
edits.append('resize guard')

# 5. the logo text is the main width hog on a narrow bar.
t = t.replace("""              <div>
                <span className="font-extrabold text-lg tracking-tight text-slate-800">Search Vailable</span>
                <p className="text-[10px] text-slate-400 leading-none">Is your business searchable?</p>
              </div>""",
"""              {/*
                The wordmark is hidden on the narrowest screens: at 360-390px it
                plus the call-to-action buttons is wider than the pill, which is
                what made the bar overflow. The full name is still shown in the
                mobile menu and from `sm` up.
              */}
              <div className="hidden sm:block min-w-0">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-800 block truncate">
                  Search Vailable
                </span>
                <p className="hidden md:block text-[10px] text-slate-400 leading-none truncate">
                  Is your business searchable?
                </p>
              </div>""")
edits.append('logo text')

# 6. let the left block shrink instead of forcing the pill wider
t = t.replace('<div className="flex items-center gap-4 sm:gap-6">',
              '<div className="flex items-center gap-2 sm:gap-6 min-w-0">')
edits.append('left min-w-0')

# 7. desktop nav now maps the shared list
old_nav = """              <nav className="hidden lg:flex items-center gap-1 ml-2">
                <a
                  href="#product"
                  className="btn btn-ghost btn-sm"
                >
                  Product
                </a>
                <a
                  href="#how-it-works"
                  className="btn btn-ghost btn-sm"
                >
                  How It Works
                </a>
                <a
                  href="#pricing"
                  className="btn btn-ghost btn-sm"
                >
                  Pricing
                </a>
              </nav>"""
new_nav = """              <nav className="hidden lg:flex items-center gap-1 ml-2">
                {LANDING_LINKS.map((link) => (
                  <a key={link.href} href={link.href} className="btn btn-ghost btn-sm">
                    {link.label}
                  </a>
                ))}
              </nav>"""
assert t.count(old_nav) == 1, 'desktop nav block not found'
t = t.replace(old_nav, new_nav, 1)
edits.append('desktop nav')

# 8. hamburger, at the end of the right-hand action group
old_tail = """            )}
          </div>
        </div>
      </header>"""
new_tail = """            )}

            {/* Mobile menu trigger. Only needed when the bar is too narrow for
                the inline links, i.e. below the `lg` breakpoint. */}
            {!currentAudit && (
              <button
                onClick={() => setMobileMenuOpen((open) => !open)}
                className="btn-icon lg:hidden shrink-0"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-nav-panel"
                id="btn-mobile-menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/*
          Mobile navigation panel. Renders the same links as the desktop bar,
          which previously simply disappeared below `lg` with nothing to replace
          them — so Product / How It Works / Pricing were unreachable on a phone.
        */}
        {!currentAudit && mobileMenuOpen && (
          <div
            className="lg:hidden max-w-[1520px] mx-auto mt-2 rounded-2xl bg-white border border-slate-200 shadow-lg overflow-hidden"
            id="mobile-nav-panel"
          >
            <nav className="flex flex-col p-2">
              {LANDING_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="p-2 pt-0 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuditModal();
                }}
                className="btn btn-primary btn-md w-full"
                id="btn-mobile-analyze"
              >
                <span>Analyze Website</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              {!currentUser && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth();
                  }}
                  className="btn btn-outline btn-md w-full"
                  id="btn-mobile-signin"
                >
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span>Log In</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>"""
assert t.count(old_tail) == 1, 'header tail not found'
t = t.replace(old_tail, new_tail, 1)
edits.append('hamburger + panel')

p.write_text(t, encoding='utf-8')
print('  applied:', ', '.join(edits))
