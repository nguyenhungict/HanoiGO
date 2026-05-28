import Link from 'next/link';
import { cookies } from 'next/headers';
import { logoutAction } from '@/lib/actions';
import Logo from '@/components/Logo';

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  const username = cookieStore.get('username')?.value;

  return (
    <div className="bg-background text-on-surface antialiased min-h-screen overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm shadow-rose-900/5 border-b border-outline/5 transition-all glass-nav">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 md:px-10 py-4">
          <Link href="/" className="flex items-center gap-2 transition-transform duration-300 hover:scale-[1.03] active:scale-[0.97]">
            <Logo className="h-8 md:h-9 w-auto text-on-surface" />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors duration-200" href="/discovery">Discovery</Link>
            <Link className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors duration-200" href="/trips">Trips</Link>
            <Link className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors duration-200" href="/activities">Activities</Link>
          </div>

          <div className="flex items-center gap-3">
            {token ? (
              <div className="flex items-center gap-4">
                <Link href="/profile" className="flex items-center gap-2 group">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-xl">account_circle</span>
                  </div>
                  <span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{username}</span>
                </Link>
                <form action={logoutAction}>
                  <button type="submit" className="text-xs font-black text-outline hover:text-primary transition-colors uppercase tracking-widest border-l border-outline/20 pl-4">
                    Logout
                  </button>
                </form>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <button className="text-sm font-bold text-on-surface-variant px-4 py-2 hover:text-primary transition-colors">
                    Log In
                  </button>
                </Link>
                <Link href="/register">
                  <button className="bg-primary text-white font-black px-5 py-2.5 rounded-xl hover:opacity-90 hover:scale-[1.02] transition-all shadow-md shadow-primary/25 text-xs uppercase tracking-widest">
                    Sign Up
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center pt-20">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            alt="Hanoi Landscape"
            className="w-full h-full object-cover scale-105"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDl2anxIUu4LaW-_eUEJbMBIEF1GwUAZyFkXwOncE-5I9f3JjSzCMIXmJQ-2ILY5dVuT1uZT2c0jCbkLEY7MbpGeen0wfH-YB-kfTYV2iKGjFE3g-t5jTpvX6A-UnZo90LB_JoeWY8kZMdsn3oNifx6pU0ECGwFo-5JOyDm_c1fpl3U1RlbWVdkYEq5a1xM7C_6K8QVBobPMq9pcetHCPm22oRNFQYJqADL4JTIbKtjr2H4d96W-KxVN1WeGSV2DtDzBalrajDQPkhy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-2 mb-8">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
            <span className="text-white/90 text-xs font-black tracking-[0.25em] uppercase">Live – Hanoi, Vietnam</span>
          </div>

          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-white tracking-tighter mb-6 leading-[1.05]">
            Curated Heritage,<br />
            <span className="text-primary drop-shadow-lg">Hyper-Modern</span> Hanoi.
          </h1>

          <p className="text-white/80 text-base md:text-xl font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
            Experience the soulful intersection of timeless tradition and contemporary living in Vietnam's vibrant capital.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <Link
              href="/register"
              className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.03] hover:shadow-2xl hover:shadow-primary/40 transition-all shadow-xl shadow-primary/30"
            >
              Start Your Journey
            </Link>
            <Link
              href="/discovery"
              className="bg-white/10 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all"
            >
              Explore Destinations
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative z-10 w-full max-w-4xl mx-auto px-6 pb-10">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-6 py-5 grid grid-cols-3 divide-x divide-white/20">
            {[
              { value: '150+', label: 'Heritage Sites' },
              { value: '12K+', label: 'Happy Travelers' },
              { value: '4.9★', label: 'Average Rating' },
            ].map((stat) => (
              <div key={stat.label} className="text-center px-4">
                <div className="text-2xl font-black text-white mb-1">{stat.value}</div>
                <div className="text-white/60 text-xs font-bold uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── Features ── */}
      <section className="py-28 px-6 md:px-10 bg-secondary-container">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-primary text-[10px] font-black tracking-[0.25em] uppercase mb-3 block">Why HanoiGO</span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-on-surface mb-4">Everything You Need to<br />Explore the City</h2>
            <p className="text-on-surface-variant font-medium max-w-xl mx-auto leading-relaxed">
              From AI-powered trip planning to real-time group activities — we've built the complete toolkit for modern travelers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: 'map',
                color: 'bg-primary/10 text-primary',
                title: 'Smart Trip Planner',
                desc: 'AI builds your day-by-day itinerary in seconds, balanced across neighborhoods and time.',
              },
              {
                icon: 'group',
                color: 'bg-tertiary/10 text-tertiary',
                title: 'Group Activities',
                desc: 'Join or create shared experiences — from sunrise temple visits to street food tours.',
              },
              {
                icon: 'chat',
                color: 'bg-secondary text-on-secondary',
                title: 'AI Travel Chat',
                desc: 'Ask our Gemini-powered assistant anything about Hanoi — history, food, transport.',
              },
              {
                icon: 'location_on',
                color: 'bg-primary/10 text-primary',
                title: 'Interactive Map',
                desc: 'Geospatial exploration with walkable radius filters and real-time place data.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-7 border border-outline/5 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${f.color}`}>
                  <span className="material-symbols-outlined text-2xl">{f.icon}</span>
                </div>
                <h3 className="text-base font-black text-on-surface mb-2 tracking-tight">{f.title}</h3>
                <p className="text-sm text-on-surface-variant font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Top Heritage Places (Bento Grid) ── */}
      <section id="destinations" className="py-28 px-6 md:px-10 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-14 gap-4">
            <div>
              <span className="text-primary text-[10px] font-black tracking-[0.2em] uppercase mb-2 block">Curation</span>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-on-surface">Top Heritage Places</h2>
            </div>
            <Link
              href="/discovery"
              className="text-primary font-black text-[10px] tracking-widest uppercase flex items-center gap-1.5 hover:gap-3 transition-all"
            >
              View All
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </div>

          {/* Asymmetric bento */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:h-[700px]">
            {/* Main card */}
            <div className="md:col-span-7 relative rounded-3xl overflow-hidden group shadow-xl shadow-rose-900/10 border border-outline/5 hover:scale-[1.01] transition-all duration-500 h-[400px] md:h-full">
              <img
                alt="Old Quarter"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDKYva0dlQQbS8kWyDgEp9i23xcqdPTI0h_PjaAO8kjj94BVYBLViqJb5jDttyiApQJPKEEfd5Aw_FyroHXMLADpK6MiJ5faIo8g9Zxr8SU00o3_4B1QLFARD_IgE8VXPRjZMselTRqQLsHXLdPtxksEa1OnTPykQ0fAhqSmqmY9EKrv-nncsorn8LAQTlCRkbvZ9CWerKQkaMoiQM3LnY-B062jaXy0AAf3PE8CcE4ZnIkN2EKynvMUEnE8lbVYr-UGPDA1g8dAhp"
              />
              <div className="absolute top-6 left-6 bg-secondary/90 backdrop-blur-md text-on-secondary px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md">
                AUTHENTIC
              </div>
              <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Old Quarter · Hoàn Kiếm</p>
                <h3 className="text-white text-3xl font-black tracking-tighter mb-2">The Old Quarter</h3>
                <p className="text-white/75 text-sm font-medium leading-relaxed max-w-sm">
                  36 streets of history, craftsmanship, and the beating heart of Hanoi's soul.
                </p>
              </div>
            </div>

            {/* Side cards */}
            <div className="md:col-span-5 grid grid-rows-2 gap-6 md:h-[700px]">
              <div className="relative rounded-3xl overflow-hidden group border border-outline/5 hover:scale-[1.01] transition-all duration-500 min-h-[280px]">
                <img
                  alt="Temple of Literature"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBjJo1pbLd7sCmPylz7bQ_HqpBxa7MvMzBKqwrjDw5J9pkrVnj34DNqEaQqgFD0K_RCEcKO8I9aKgSAjq-qPca-QQixQoG1r_x5vzIDlGDUgsTqCbuhtTLeDZaNg4gx-dA4s7ClGEWwX2PiQpP42diXzr3pxSl1rS2xU5fJLQenhIAWSdss9bKzzr-_elS4-2cVZab27BbgTJSa-g0jbF1LwNqiLXl2ioGTER7Vd3nNNXmEj37Y9iwIPEOY-UAVoqXiW7n_TFkcNrsS"
                />
                <div className="absolute top-5 left-5 bg-white/90 backdrop-blur-md text-primary px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest">
                  SCHOLARSHIP
                </div>
                <div className="absolute bottom-0 inset-x-0 p-7 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Đống Đa · 1076 AD</p>
                  <h3 className="text-white text-xl font-black tracking-tighter">Temple of Literature</h3>
                </div>
              </div>
              <div className="relative rounded-3xl overflow-hidden group border border-outline/5 hover:scale-[1.01] transition-all duration-500 min-h-[280px]">
                <img
                  alt="Hanoi Opera House"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrMeOw0lnCTXsl_D_yB6Q60M4bdMT0f7Bsd1-J-8NUXLy7905okpRPBGkLwbzTxm0ZqzujmOoqx8UPl1Xatz7q1lJoyLv9P8GLGT6n1ahQ3hW_Dy3MJNplf8zvasUQPja2Tnmo8uCdsQYiQhugt_RYMmmp5X63QleZJV8M4UxVOynfHChX4l9vJFJqhtQKMD4NaPB4hl1xtr55jIv_9JxUk4KpD8ZN_xaaVCwyKk_mUvm28ZMxrptAgeRj-9rYpNIWFyuQNwVBwZQG"
                />
                <div className="absolute top-5 left-5 bg-white/90 backdrop-blur-md text-primary px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest">
                  COLONIAL
                </div>
                <div className="absolute bottom-0 inset-x-0 p-7 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Hoàn Kiếm · 1901</p>
                  <h3 className="text-white text-xl font-black tracking-tighter">Hanoi Opera House</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Itineraries ── */}
      <section id="itineraries" className="py-28 px-6 md:px-10 bg-secondary-container">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-14 gap-4">
            <div>
              <span className="text-primary text-[10px] font-black tracking-[0.2em] uppercase mb-2 block">Planned Journeys</span>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-on-surface">Discover Itineraries</h2>
            </div>
            <Link href="/trips" className="text-primary font-black text-[10px] tracking-widest uppercase flex items-center gap-1.5 hover:gap-3 transition-all">
              Browse All Trips
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDkUDoMZfAQIR73a1iggTlfYshLqdNHm6hnmcUEIXu0ADTkLK6PvV2MoXt5DfNvMmFY_MatarPoNJYvR1H-hUrGfeoPUsOJjkGTpZiPXJZ-NvUqR69WgUoCxa_UcEuk9JV89RbJtP7T21QZCfKcyrnlXa3X2GC9fYlYCoVa37nGgUO-KQOWyRk0LAonnAISQBOxqUNT30na60sXFCeMLciY7Jir6hkTlOVg2wK_usllN75cEHpP93duu7BjhVH44Nb5aoKF04DioKhd',
                badge: '48 Hours',
                icon: 'restaurant',
                title: 'The Culinary Archivist',
                desc: 'A deep dive into northern street food — from secret Phở stalls to hidden egg coffee cafes.',
                cta: 'Explore Route',
                tag: 'Food & Culture',
              },
              {
                img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDPmHg-KQczEJ1gb-UUq-TZxFcuQNSmabTOBZffMXd7S8ipz1KXhvK1mVVM_3qIYc6u0uaeU2-fvvA4zVwBA2x9GIoVZDohWDLNQEgpe-4Ni_4ZcjKE1ShxV3Y606-kACICBOyaewV3VsP19-Dd8GS862-cJfbn5Z0cCdfgxx3avJmvFAxTz9ZXKTTmnBD6Y1vDy_JbaRpkVBxDu5OjMSv75ETrK6qPAGLwQpqWdvQ5VnGnzl9vYQ-WIl0ksdmn6uOQvOCa84f36Lg6',
                badge: '3 Days',
                icon: 'handyman',
                title: 'Artisans & Guilds',
                desc: 'Trace the 36 guilds — visiting multi-generational workshops in the heart of the city.',
                cta: 'Explore Route',
                tag: 'Heritage',
              },
              {
                img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1974&auto=format&fit=crop',
                badge: 'Immersion',
                icon: 'palette',
                title: 'Ancient Craft Workshops',
                desc: 'Join local artisans in hidden courtyards for traditional lacquer and silk workshops.',
                cta: 'Book Experience',
                tag: 'Workshop',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-white rounded-3xl overflow-hidden shadow-lg shadow-rose-900/5 border border-outline/5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-400 group flex flex-col"
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    alt={card.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    src={card.img}
                  />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-on-surface px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                    {card.tag}
                  </div>
                </div>
                <div className="p-8 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-primary text-base">{card.icon}</span>
                    <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em]">{card.badge}</span>
                  </div>
                  <h3 className="text-xl font-black tracking-tighter text-on-surface mb-3">{card.title}</h3>
                  <p className="text-sm text-on-surface-variant font-medium mb-6 leading-relaxed flex-1">{card.desc}</p>
                  <button className="text-primary font-black text-[10px] uppercase tracking-widest flex items-center gap-2 group/btn w-fit">
                    {card.cta}
                    <span className="material-symbols-outlined text-base transition-transform group-hover/btn:translate-x-1">arrow_forward</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-28 px-6 md:px-10 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-primary text-[10px] font-black tracking-[0.25em] uppercase mb-3 block">Traveler Stories</span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-on-surface">Loved by Explorers</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote: 'HanoiGO turned a 2-day stopover into the most memorable trip of my year. The itinerary planner is magical.',
                name: 'Sophie T.',
                role: 'Solo traveler, France',
                avatar: 'ST',
              },
              {
                quote: 'Finding a group cooking class through the Activities feature was effortless. Met amazing people and ate even better food.',
                name: 'James K.',
                role: 'Travel blogger, UK',
                avatar: 'JK',
              },
              {
                quote: 'The AI chat knew more about Hanoi history than my tour guide. Absolutely invaluable for a history nerd like me.',
                name: 'Minh L.',
                role: 'Historian & traveler, Vietnam',
                avatar: 'ML',
              },
            ].map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-8 border border-outline/5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex gap-1 mb-5">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  ))}
                </div>
                <p className="text-on-surface-variant font-medium leading-relaxed text-sm mb-6">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-on-secondary text-xs font-black">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-black text-on-surface">{t.name}</p>
                    <p className="text-xs text-on-surface-variant font-medium">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="relative overflow-hidden py-28 px-6 md:px-10">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBIP-AFPU1-8Iy_JaIV_pqT5TofmPo5NYbbiydkCFFhANNo3Z9GwfOWmxoT6HUZdvubliUFFjAhg-WZ3dtbm29dzFm2Ft4lBZt8hxKZHdM4abHLVFyL0S4kgJiJCLweZ2-cUYuo3PK9TKON6d9waTdhJr4AGUahHs_zlkq5D8ZygdsKfCPbWu6Ix4SF37VVlm-I7qRre8__OuiqPzZ3oumrT0nCW40OsmHnEx-mR-vV3Dhjw33GmizknlXKjkDDCCOl_2B9B5xkm0_u"
            alt=""
          />
          <div className="absolute inset-0 bg-on-surface/75" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <span className="text-primary text-[10px] font-black tracking-[0.25em] uppercase mb-4 block">Begin Your Story</span>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white mb-6 leading-tight">
            Ready to write<br />your own chapter?
          </h2>
          <p className="text-white/70 font-medium mb-10 max-w-lg mx-auto leading-relaxed">
            Join thousands of travelers who've discovered Hanoi's hidden gems with HanoiGO. Free to start, unforgettable forever.
          </p>
          <div className="flex flex-wrap justify-center gap-5">
            <Link
              href="/register"
              className="bg-primary text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.03] hover:shadow-2xl hover:shadow-primary/40 transition-all shadow-xl shadow-primary/30"
            >
              Create Free Account
            </Link>
            <Link
              href="/discovery"
              className="bg-white/10 backdrop-blur-md border border-white/25 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all"
            >
              Browse Destinations
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-outline/10 py-20 px-6 md:px-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-14">
          <div className="md:col-span-1 space-y-5">
            <Logo className="h-8 w-auto text-on-surface" />
            <p className="text-sm font-medium leading-relaxed text-on-surface-variant max-w-xs">
              Curating the intersection of heritage and modernity. Your premium guide to the soul of the North.
            </p>
            <div className="flex gap-3">
              {['facebook', 'instagram', 'language'].map((icon) => (
                <div key={icon} className="w-9 h-9 rounded-xl bg-background border border-outline/10 flex items-center justify-center hover:bg-secondary cursor-pointer transition-colors">
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">{icon}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-on-surface mb-6">Explore</h4>
              {['Discovery', 'Trips', 'Activities', 'Places'].map((item) => (
                <Link key={item} className="block text-on-surface-variant hover:text-primary transition-colors text-sm font-medium" href={`/${item.toLowerCase()}`}>
                  {item}
                </Link>
              ))}
            </div>
            <div className="space-y-3">
              <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-on-surface mb-6">Company</h4>
              {['About', 'Community', 'Support', 'Privacy'].map((item) => (
                <Link key={item} className="block text-on-surface-variant hover:text-primary transition-colors text-sm font-medium" href="#">
                  {item}
                </Link>
              ))}
            </div>
          </div>

          <div className="md:col-span-1 space-y-5">
            <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-on-surface">Stay in the Loop</h4>
            <p className="text-xs text-on-surface-variant font-medium">Get curated travel insights and hidden gems delivered weekly.</p>
            <div className="flex gap-2 p-1.5 bg-background rounded-xl border border-outline/10">
              <input
                className="bg-transparent px-3 py-2 flex-1 text-xs font-medium outline-none text-on-surface placeholder:text-on-surface-variant/50"
                placeholder="your@email.com"
                type="email"
              />
              <button className="bg-primary text-white px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-md shadow-primary/20 hover:opacity-90 transition-opacity">
                Join
              </button>
            </div>
            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">© 2025 HanoiGO · The Modern Archivist.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
