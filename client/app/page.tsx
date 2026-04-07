import Link from 'next/link';
import { cookies } from 'next/headers';
import { logoutAction } from '@/lib/actions';

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  const username = cookieStore.get('username')?.value;

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl shadow-sm shadow-rose-900/5 transition-all glass-nav">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-8 py-4">
          <Link href="/" className="text-2xl font-black text-rose-500 tracking-tighter">HanoiGO</Link>
          <div className="hidden md:flex items-center gap-8 font-['Inter'] tracking-tight font-medium">
            
            <a className="text-neutral-600 hover:text-rose-500 transition-colors duration-300" href="/discovery">Discovery</a>
            <a className="text-neutral-600 hover:text-rose-500 transition-colors duration-300" href="/trips">Trips</a>
            <a className="text-neutral-600 hover:text-rose-500 transition-colors duration-300" href="/activities">Activities</a>
          </div>
          
          <div className="flex items-center gap-4">
            {token ? (
              <div className="flex items-center gap-4">
                <Link href="/profile" className="flex items-center gap-2 group">
                   <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center overflow-hidden">
                      <span className="material-symbols-outlined text-rose-500 text-xl">account_circle</span>
                   </div>
                   <span className="text-sm font-bold text-neutral-700 group-hover:text-rose-500 transition-colors">{username}</span>
                </Link>
                <form action={logoutAction}>
                  <button type="submit" className="text-xs font-bold text-neutral-500 hover:text-rose-500 transition-colors uppercase tracking-widest border-l border-neutral-200 pl-4">Logout</button>
                </form>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <button className="text-neutral-600 font-medium px-4 py-2 hover:text-rose-500 transition-all">Log In</button>
                </Link>
                <Link href="/register">
                  <button className="bg-gradient-to-br from-primary to-primary-container text-white font-bold px-6 py-2.5 rounded-md hover:opacity-90 transition-all shadow-md">Sign Up</button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative h-[85vh] w-full overflow-hidden flex items-center justify-center pt-20">
        <div className="absolute inset-0 z-0">
          <img
            alt="Hanoi Landscape"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDl2anxIUu4LaW-_eUEJbMBIEF1GwUAZyFkXwOncE-5I9f3JjSzCMIXmJQ-2ILY5dVuT1uZT2c0jCbkLEY7MbpGeen0wfH-YB-kfTYV2iKGjFE3g-t5jTpvX6A-UnZo90LB_JoeWY8kZMdsn3oNifx6pU0ECGwFo-5JOyDm_c1fpl3U1RlbWVdkYEq5a1xM7C_6K8QVBobPMq9pcetHCPm22oRNFQYJqADL4JTIbKtjr2H4d96W-KxVN1WeGSV2DtDzBalrajDQPkhy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-on-surface/30 to-on-surface/60"></div>
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <span className="text-white text-sm font-bold tracking-[0.3em] uppercase mb-6 block drop-shadow-md">The Modern Archivist</span>
          <h1 className="text-6xl md:text-8xl font-extrabold text-white tracking-tighter mb-10 leading-[1.1] drop-shadow-lg">
            Curated Heritage, <br />Hyper-Modern Hanoi.
          </h1>
          <p className="text-white/90 text-lg md:text-xl font-medium max-w-2xl mx-auto mb-10 leading-relaxed drop-shadow-md">
            Experience the soulful intersection of timeless tradition and contemporary luxury in Vietnam's vibrant capital.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <button className="bg-primary text-white px-10 py-4 rounded-md font-bold hover:scale-105 transition-transform shadow-lg">Start Your Journey</button>
            <button className="bg-white/10 backdrop-blur-md border border-white/30 text-white px-10 py-4 rounded-md font-bold hover:bg-white/20 transition-all">Explore Destinations</button>
          </div>
        </div>
      </header>

      {/* Top Heritage Places */}
      <section id="destinations" className="py-24 px-8 bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <span className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-2 block">Curation</span>
              <h2 className="text-4xl font-extrabold tracking-tighter text-on-surface">Top Heritage Places</h2>
            </div>
            <button className="text-primary font-bold text-sm tracking-tight border-b-2 border-primary/20 hover:border-primary transition-all pb-1">View All Destinations</button>
          </div>
          {/* Asymmetric Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:h-[700px]">
            <div className="md:col-span-8 relative rounded-xl overflow-hidden group shadow-sm transition-transform duration-500 hover:scale-[1.01] h-[400px] md:h-full">
              <img
                alt="Old Quarter"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDKYva0dlQQbS8kWyDgEp9i23xcqdPTI0h_PjaAO8kjj94BVYBLViqJb5jDttyiApQJPKEEfd5Aw_FyroHXMLADpK6MiJ5faIo8g9Zxr8SU00o3_4B1QLFARD_IgE8VXPRjZMselTRqQLsHXLdPtxksEa1OnTPykQ0fAhqSmqmY9EKrv-nncsorn8LAQTlCRkbvZ9CWerKQkaMoiQM3LnY-B062jaXy0AAf3PE8CcE4ZnIkN2EKynvMUEnE8lbVYr-UGPDA1g8dAhp"
              />
              <div className="absolute top-6 left-6 bg-secondary-fixed text-on-secondary-fixed-variant px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">AUTHENTIC</div>
              <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-white text-2xl font-bold mb-2">The Old Quarter</h3>
                <p className="text-white/80 text-sm max-w-md">36 streets of history, craftsmanship, and the beating heart of Hanoi's soul.</p>
              </div>
            </div>
            <div className="md:col-span-4 grid grid-rows-2 gap-6 h-[700px] md:h-auto">
              <div className="relative rounded-xl overflow-hidden group shadow-sm h-full">
                <img
                  alt="Temple of Literature"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBjJo1pbLd7sCmPylz7bQ_HqpBxa7MvMzBKqwrjDw5J9pkrVnj34DNqEaQqgFD0K_RCEcKO8I9aKgSAjq-qPca-QQixQoG1r_x5vzIDlGDUgsTqCbuhtTLeDZaNg4gx-dA4s7ClGEWwX2PiQpP42diXzr3pxSl1rS2xU5fJLQenhIAWSdss9bKzzr-_elS4-2cVZab27BbgTJSa-g0jbF1LwNqiLXl2ioGTER7Vd3nNNXmEj37Y9iwIPEOY-UAVoqXiW7n_TFkcNrsS"
                />
                <div className="absolute top-6 left-6 bg-secondary-fixed text-on-secondary-fixed-variant px-4 py-1.5 rounded-full text-xs font-bold">SCHOLARSHIP</div>
                <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                  <h3 className="text-white text-xl font-bold">Temple of Literature</h3>
                </div>
              </div>
              <div className="relative rounded-xl overflow-hidden group shadow-sm h-full">
                <img
                  alt="Opera House"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrMeOw0lnCTXsl_D_yB6Q60M4bdMT0f7Bsd1-J-8NUXLy7905okpRPBGkLwbzTxm0ZqzujmOoqx8UPl1Xatz7q1lJoyLv9P8GLGT6n1ahQ3hW_Dy3MJNplf8zvasUQPja2Tnmo8uCdsQYiQhugt_RYMmmp5X63QleZJV8M4UxVOynfHChX4l9vJFJqhtQKMD4NaPB4hl1xtr55jIv_9JxUk4KpD8ZN_xaaVCwyKk_mUvm28ZMxrptAgeRj-9rYpNIWFyuQNwVBwZQG"
                />
                <div className="absolute top-6 left-6 bg-secondary-fixed text-on-secondary-fixed-variant px-4 py-1.5 rounded-full text-xs font-bold">COLONIAL</div>
                <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                  <h3 className="text-white text-xl font-bold">Hanoi Opera House</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Discover Itineraries/Experiences Section */}
      <section id="itineraries" className="py-24 px-8 bg-surface-container-low">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 max-w-2xl">
            <span className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-2 block">Planned Journeys</span>
            <h2 className="text-4xl font-extrabold tracking-tighter text-on-surface mb-4">Discover Itineraries</h2>
            <p className="text-on-surface-variant leading-relaxed">Our archivists have mapped out the most evocative routes through the city, balancing mandatory landmarks with secret local haunts.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Itinerary Card 1 */}
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
              <div className="h-64 overflow-hidden">
                <img
                  alt="Food Tour"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkUDoMZfAQIR73a1iggTlfYshLqdNHm6hnmcUEIXu0ADTkLK6PvV2MoXt5DfNvMmFY_MatarPoNJYvR1H-hUrGfeoPUsOJjkGTpZiPXJZ-NvUqR69WgUoCxa_UcEuk9JV89RbJtP7T21QZCfKcyrnlXa3X2GC9fYlYCoVa37nGgUO-KQOWyRk0LAonnAISQBOxqUNT30na60sXFCeMLciY7Jir6hkTlOVg2wK_usllN75cEHpP93duu7BjhVH44Nb5aoKF04DioKhd"
                />
              </div>
              <div className="p-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary text-sm">schedule</span>
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">48 Hours</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface mb-3">The Culinary Archivist</h3>
                <p className="text-sm text-on-surface-variant mb-6 line-clamp-2">A deep dive into the street food culture of the north, from secret Pho stalls to hidden egg coffee cafes.</p>
                <button className="text-primary font-extrabold text-sm flex items-center gap-2 group/btn tertiary-hover">
                  Explore Route
                  <span className="material-symbols-outlined text-base transition-transform group-hover/btn:translate-x-1">arrow_forward</span>
                </button>
              </div>
            </div>
            {/* Itinerary Card 2 */}
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
              <div className="h-64 overflow-hidden">
                <img
                  alt="Portrait Photographer"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDPmHg-KQczEJ1gb-UUq-TZxFcuQNSmabTOBZffMXd7S8ipz1KXhvK1mVVM_3qIYc6u0uaeU2-fvvA4zVwBA2x9GIoVZDohWDLNQEgpe-4Ni_4ZcjKE1ShxV3Y606-kACICBOyaewV3VsP19-Dd8GS862-cJfbn5Z0cCdfgxx3avJmvFAxTz9ZXKTTmnBD6Y1vDy_JbaRpkVBxDu5OjMSv75ETrK6qPAGLwQpqWdvQ5VnGnzl9vYQ-WIl0ksdmn6uOQvOCa84f36Lg6"
                />
              </div>
              <div className="p-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary text-sm">schedule</span>
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">3 Days</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface mb-3">Artisans & Guilds</h3>
                <p className="text-sm text-on-surface-variant mb-6 line-clamp-2">Trace the history of the 36 guilds, visiting multi-generational workshops in the heart of the city.</p>
                <button className="text-primary font-extrabold text-sm flex items-center gap-2 group/btn tertiary-hover">
                  Explore Route
                  <span className="material-symbols-outlined text-base transition-transform group-hover/btn:translate-x-1">arrow_forward</span>
                </button>
              </div>
            </div>
            {/* Experience Card (Updated) */}
            <div id="experiences" className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
              <div className="h-64 overflow-hidden">
                <img
                  alt="Traditional Craft"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB26Z8T7x8BqG-G8R3f3I8O5B7H-Q2W1Y-Z7x3B5C7D-Q2W1Y-Z7x3B5C7D-Q2W1Y-Z7x3B5C7D-Q2W1Y-Z7x3B5C7D-Q2W1Y-Z7x3B5C7D_Hanoi_Craft"
                />
              </div>
              <div className="p-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary text-sm">palette</span>
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Immersion</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface mb-3">Ancient Craft Workshops</h3>
                <p className="text-sm text-on-surface-variant mb-6 line-clamp-2">Join local artisans in the hidden courtyards of the Old Quarter for traditional lacquer and silk workshops.</p>
                <button className="text-primary font-extrabold text-sm flex items-center gap-2 group/btn tertiary-hover">
                  Book Experience
                  <span className="material-symbols-outlined text-base transition-transform group-hover/btn:translate-x-1">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map/CTA Section */}
      <section className="relative h-[400px] w-full bg-surface-dim flex items-center justify-center overflow-hidden uppercase">
        <div className="absolute inset-0 grayscale opacity-20">
          <img
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBIP-AFPU1-8Iy_JaIV_pqT5TofmPo5NYbbiydkCFFhANNo3Z9GwfOWmxoT6HUZdvubliUFFjAhg-WZ3dtbm29dzFm2Ft4lBZt8hxKZHdM4abHLVFyL0S4kgJiJCLweZ2-cUYuo3PK9TKON6d9waTdhJr4AGUahHs_zlkq5D8ZygdsKfCPbWu6Ix4SF37VVlm-I7qRre8__OuiqPzZ3oumrT0nCW40OsmHnEx-mR-vV3Dhjw33GmizknlXKjkDDCCOl_2B9B5xkm0_u"
          />
        </div>
        <div className="relative z-10 text-center px-8">
          <h2 className="text-4xl font-extrabold tracking-tighter text-on-surface mb-6">Ready to write your own chapter?</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="bg-primary text-white px-10 py-4 rounded-md font-bold hover:scale-105 transition-transform shadow-lg">Book Your Experience</button>
            <button className="bg-secondary-container text-on-secondary-container px-10 py-4 rounded-md font-bold hover:opacity-90 transition-opacity">Contact a Local Expert</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-50 dark:bg-neutral-900 w-full py-12 px-8 tonal-shift">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <div className="font-bold text-rose-500 text-2xl tracking-tighter">HanoiGO</div>
            <p className="font-['Inter'] text-sm leading-relaxed text-neutral-500 max-w-xs">
              Curating the intersection of heritage and modernity. We are your premium guide to the soul of the North.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-on-surface mb-4">Company</h4>
              <a className="block text-neutral-500 hover:text-rose-500 transition-colors text-sm" href="#">About</a>
              <a className="block text-neutral-500 hover:text-rose-500 transition-colors text-sm" href="#">Community</a>
              <a className="block text-neutral-500 hover:text-rose-500 transition-colors text-sm" href="#">Support</a>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-on-surface mb-4">Services</h4>
              <a className="block text-neutral-500 hover:text-rose-500 transition-colors text-sm" href="#">Private Tours</a>
              <a className="block text-neutral-500 hover:text-rose-500 transition-colors text-sm" href="#">Hotel Curation</a>
              <a className="block text-neutral-500 hover:text-rose-500 transition-colors text-sm" href="#">Concierge</a>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-on-surface">Newsletter</h4>
            <div className="flex gap-2">
              <input className="bg-white border focus:border-rose-500 rounded-md px-4 py-2 flex-1 text-sm outline-none" placeholder="Your email" type="email" />
              <button className="bg-on-surface text-white px-4 py-2 rounded-md font-bold text-sm">Join</button>
            </div>
            <p className="text-[10px] text-neutral-400">© 2024 HanoiGO. The Modern Archivist.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
