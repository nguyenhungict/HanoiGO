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
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm shadow-rose-900/5 transition-all glass-nav border-b border-outline/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-8 py-4">
          <Link href="/" className="text-2xl font-black text-primary tracking-tighter">HanoiGO</Link>
          <div className="hidden md:flex items-center gap-8 font-headline tracking-tight font-medium">
            <Link className="text-on-surface-variant hover:text-primary transition-colors duration-300" href="/discovery">Discovery</Link>
            <Link className="text-on-surface-variant hover:text-primary transition-colors duration-300" href="/trips">Trips</Link>
            <Link className="text-on-surface-variant hover:text-primary transition-colors duration-300" href="/activities">Activities</Link>
          </div>

          <div className="flex items-center gap-4">
            {token ? (
              <div className="flex items-center gap-4">
                <Link href="/profile" className="flex items-center gap-2 group">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                    <span className="material-symbols-outlined text-primary text-xl">account_circle</span>
                  </div>
                  <span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{username}</span>
                </Link>
                <form action={logoutAction}>
                  <button type="submit" className="text-xs font-black text-outline hover:text-primary transition-colors uppercase tracking-widest border-l border-outline/20 pl-4">Logout</button>
                </form>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <button className="text-on-surface-variant font-bold px-4 py-2 hover:text-primary transition-all">Log In</button>
                </Link>
                <Link href="/register">
                  <button className="bg-primary text-white font-black px-6 py-2.5 rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-primary/20 text-[10px] uppercase tracking-widest">Sign Up</button>
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
            className="w-full h-full object-cover scale-105"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDl2anxIUu4LaW-_eUEJbMBIEF1GwUAZyFkXwOncE-5I9f3JjSzCMIXmJQ-2ILY5dVuT1uZT2c0jCbkLEY7MbpGeen0wfH-YB-kfTYV2iKGjFE3g-t5jTpvX6A-UnZo90LB_JoeWY8kZMdsn3oNifx6pU0ECGwFo-5JOyDm_c1fpl3U1RlbWVdkYEq5a1xM7C_6K8QVBobPMq9pcetHCPm22oRNFQYJqADL4JTIbKtjr2H4d96W-KxVN1WeGSV2DtDzBalrajDQPkhy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-on-surface/40 to-on-surface/80"></div>
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <span className="text-secondary text-[10px] font-black tracking-[0.4em] uppercase mb-6 block drop-shadow-md">The Modern Archivist</span>
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-10 leading-[1.1] drop-shadow-2xl">
            Curated Heritage, <br />Hyper-Modern Hanoi.
          </h1>
          <p className="text-white/90 text-lg md:text-xl font-medium max-w-2xl mx-auto mb-12 leading-relaxed drop-shadow-md">
            Experience the soulful intersection of timeless tradition and contemporary luxury in Vietnam's vibrant capital.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/register" className="bg-primary text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/30">Start Your Journey</Link>
            <Link href="/discovery" className="bg-white/10 backdrop-blur-md border border-white/30 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-white/20 transition-all">Explore Destinations</Link>
          </div>
        </div>
      </header>

      {/* Top Heritage Places */}
      <section id="destinations" className="py-32 px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
            <div>
              <span className="text-primary text-[10px] font-black tracking-[0.2em] uppercase mb-3 block">Curation</span>
              <h2 className="text-5xl font-black tracking-tighter text-on-surface">Top Heritage Places</h2>
            </div>
            <Link href="/discovery" className="text-primary font-black text-[10px] tracking-widest uppercase border-b-2 border-primary/20 hover:border-primary transition-all pb-1 mb-2">View All Destinations</Link>
          </div>
          {/* Asymmetric Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:h-[750px]">
            <div className="md:col-span-8 relative rounded-[2rem] overflow-hidden group shadow-2xl shadow-rose-900/10 border border-outline/5 transition-all duration-700 hover:scale-[1.01] h-[450px] md:h-full">
              <img
                alt="Old Quarter"
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDKYva0dlQQbS8kWyDgEp9i23xcqdPTI0h_PjaAO8kjj94BVYBLViqJb5jDttyiApQJPKEEfd5Aw_FyroHXMLADpK6MiJ5faIo8g9Zxr8SU00o3_4B1QLFARD_IgE8VXPRjZMselTRqQLsHXLdPtxksEa1OnTPykQ0fAhqSmqmY9EKrv-nncsorn8LAQTlCRkbvZ9CWerKQkaMoiQM3LnY-B062jaXy0AAf3PE8CcE4ZnIkN2EKynvMUEnE8lbVYr-UGPDA1g8dAhp"
              />
              <div className="absolute top-8 left-8 bg-secondary/90 backdrop-blur-md text-on-secondary px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">AUTHENTIC</div>
              <div className="absolute bottom-0 inset-x-0 p-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                <h3 className="text-white text-3xl font-black tracking-tighter mb-3">The Old Quarter</h3>
                <p className="text-white/80 text-sm max-w-md font-medium leading-relaxed">36 streets of history, craftsmanship, and the beating heart of Hanoi's soul.</p>
              </div>
            </div>
            <div className="md:col-span-4 grid grid-rows-2 gap-8 h-[800px] md:h-auto">
              <div className="relative rounded-[2rem] overflow-hidden group shadow-xl shadow-rose-900/5 border border-outline/5 h-full">
                <img
                  alt="Temple of Literature"
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBjJo1pbLd7sCmPylz7bQ_HqpBxa7MvMzBKqwrjDw5J9pkrVnj34DNqEaQqgFD0K_RCEcKO8I9aKgSAjq-qPca-QQixQoG1r_x5vzIDlGDUgsTqCbuhtTLeDZaNg4gx-dA4s7ClGEWwX2PiQpP42diXzr3pxSl1rS2xU5fJLQenhIAWSdss9bKzzr-_elS4-2cVZab27BbgTJSa-g0jbF1LwNqiLXl2ioGTER7Vd3nNNXmEj37Y9iwIPEOY-UAVoqXiW7n_TFkcNrsS"
                />
                <div className="absolute top-8 left-8 bg-white/90 backdrop-blur-md text-primary px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">SCHOLARSHIP</div>
                <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
                  <h3 className="text-white text-2xl font-black tracking-tighter">Temple of Literature</h3>
                </div>
              </div>
              <div className="relative rounded-[2rem] overflow-hidden group shadow-xl shadow-rose-900/5 border border-outline/5 h-full">
                <img
                  alt="Opera House"
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrMeOw0lnCTXsl_D_yB6Q60M4bdMT0f7Bsd1-J-8NUXLy7905okpRPBGkLwbzTxm0ZqzujmOoqx8UPl1Xatz7q1lJoyLv9P8GLGT6n1ahQ3hW_Dy3MJNplf8zvasUQPja2Tnmo8uCdsQYiQhugt_RYMmmp5X63QleZJV8M4UxVOynfHChX4l9vJFJqhtQKMD4NaPB4hl1xtr55jIv_9JxUk4KpD8ZN_xaaVCwyKk_mUvm28ZMxrptAgeRj-9rYpNIWFyuQNwVBwZQG"
                />
                <div className="absolute top-8 left-8 bg-white/90 backdrop-blur-md text-primary px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">COLONIAL</div>
                <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
                  <h3 className="text-white text-2xl font-black tracking-tighter">Hanoi Opera House</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Discover Itineraries/Experiences Section */}
      <section id="itineraries" className="py-32 px-8 bg-surface-container-low">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20 max-w-2xl">
            <span className="text-primary text-[10px] font-black tracking-[0.2em] uppercase mb-3 block">Planned Journeys</span>
            <h2 className="text-5xl font-black tracking-tighter text-on-surface mb-6">Discover Itineraries</h2>
            <p className="text-on-surface-variant leading-relaxed font-medium">Our archivists have mapped out the most evocative routes through the city, balancing mandatory landmarks with secret local haunts.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Itinerary Card 1 */}
            <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl shadow-rose-900/5 border border-outline/5 hover:shadow-2xl transition-all duration-500 group">
              <div className="h-72 overflow-hidden">
                <img
                  alt="Food Tour"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkUDoMZfAQIR73a1iggTlfYshLqdNHm6hnmcUEIXu0ADTkLK6PvV2MoXt5DfNvMmFY_MatarPoNJYvR1H-hUrGfeoPUsOJjkGTpZiPXJZ-NvUqR69WgUoCxa_UcEuk9JV89RbJtP7T21QZCfKcyrnlXa3X2GC9fYlYCoVa37nGgUO-KQOWyRk0LAonnAISQBOxqUNT30na60sXFCeMLciY7Jir6hkTlOVg2wK_usllN75cEHpP93duu7BjhVH44Nb5aoKF04DioKhd"
                />
              </div>
              <div className="p-10">
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-primary text-lg">schedule</span>
                  <span className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">48 Hours</span>
                </div>
                <h3 className="text-2xl font-black tracking-tighter text-on-surface mb-4">The Culinary Archivist</h3>
                <p className="text-sm text-outline font-medium mb-8 line-clamp-2 leading-relaxed">A deep dive into the street food culture of the north, from secret Pho stalls to hidden egg coffee cafes.</p>
                <button className="text-primary font-black text-[10px] uppercase tracking-widest flex items-center gap-2 group/btn">
                  Explore Route
                  <span className="material-symbols-outlined text-base transition-transform group-hover/btn:translate-x-1">arrow_forward</span>
                </button>
              </div>
            </div>
            {/* Itinerary Card 2 */}
            <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl shadow-rose-900/5 border border-outline/5 hover:shadow-2xl transition-all duration-500 group">
              <div className="h-72 overflow-hidden">
                <img
                  alt="Portrait Photographer"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDPmHg-KQczEJ1gb-UUq-TZxFcuQNSmabTOBZffMXd7S8ipz1KXhvK1mVVM_3qIYc6u0uaeU2-fvvA4zVwBA2x9GIoVZDohWDLNQEgpe-4Ni_4ZcjKE1ShxV3Y606-kACICBOyaewV3VsP19-Dd8GS862-cJfbn5Z0cCdfgxx3avJmvFAxTz9ZXKTTmnBD6Y1vDy_JbaRpkVBxDu5OjMSv75ETrK6qPAGLwQpqWdvQ5VnGnzl9vYQ-WIl0ksdmn6uOQvOCa84f36Lg6"
                />
              </div>
              <div className="p-10">
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-primary text-lg">schedule</span>
                  <span className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">3 Days</span>
                </div>
                <h3 className="text-2xl font-black tracking-tighter text-on-surface mb-4">Artisans & Guilds</h3>
                <p className="text-sm text-outline font-medium mb-8 line-clamp-2 leading-relaxed">Trace the history of the 36 guilds, visiting multi-generational workshops in the heart of the city.</p>
                <button className="text-primary font-black text-[10px] uppercase tracking-widest flex items-center gap-2 group/btn">
                  Explore Route
                  <span className="material-symbols-outlined text-base transition-transform group-hover/btn:translate-x-1">arrow_forward</span>
                </button>
              </div>
            </div>
            {/* Experience Card */}
            <div id="experiences" className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl shadow-rose-900/5 border border-outline/5 hover:shadow-2xl transition-all duration-500 group">
              <div className="h-72 overflow-hidden">
                <img
                  alt="Traditional Craft"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1974&auto=format&fit=crop"
                />
              </div>
              <div className="p-10">
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-primary text-lg">palette</span>
                  <span className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">Immersion</span>
                </div>
                <h3 className="text-2xl font-black tracking-tighter text-on-surface mb-4">Ancient Craft Workshops</h3>
                <p className="text-sm text-outline font-medium mb-8 line-clamp-2 leading-relaxed">Join local artisans in the hidden courtyards of the Old Quarter for traditional lacquer and silk workshops.</p>
                <button className="text-primary font-black text-[10px] uppercase tracking-widest flex items-center gap-2 group/btn">
                  Book Experience
                  <span className="material-symbols-outlined text-base transition-transform group-hover/btn:translate-x-1">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map/CTA Section */}
      <section className="relative h-[500px] w-full bg-surface-container-highest flex items-center justify-center overflow-hidden uppercase">
        <div className="absolute inset-0 grayscale opacity-20 scale-110">
          <img
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBIP-AFPU1-8Iy_JaIV_pqT5TofmPo5NYbbiydkCFFhANNo3Z9GwfOWmxoT6HUZdvubliUFFjAhg-WZ3dtbm29dzFm2Ft4lBZt8hxKZHdM4abHLVFyL0S4kgJiJCLweZ2-cUYuo3PK9TKON6d9waTdhJr4AGUahHs_zlkq5D8ZygdsKfCPbWu6Ix4SF37VVlm-I7qRre8__OuiqPzZ3oumrT0nCW40OsmHnEx-mR-vV3Dhjw33GmizknlXKjkDDCCOl_2B9B5xkm0_u"
          />
        </div>
        <div className="absolute inset-0 bg-primary/5"></div>
        <div className="relative z-10 text-center px-8">
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-on-surface mb-10 lowercase">Ready to write <br />your own chapter?</h2>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/register" className="bg-primary text-white px-12 py-5 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl shadow-primary/30">Book Your Experience</Link>
            <button className="bg-secondary text-on-secondary px-12 py-5 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] hover:opacity-90 transition-opacity shadow-xl shadow-secondary/20">Contact a Local Expert</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white w-full py-24 px-8 border-t border-outline/10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
          <div className="md:col-span-1 space-y-6">
            <div className="font-black text-primary text-3xl tracking-tighter">HanoiGO</div>
            <p className="text-sm font-medium leading-relaxed text-outline max-w-xs">
              Curating the intersection of heritage and modernity. We are your premium guide to the soul of the North.
            </p>
          </div>
          <div className="md:col-span-2 grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface mb-8">Company</h4>
              <Link className="block text-outline hover:text-primary transition-colors text-xs font-bold" href="#">About</Link>
              <Link className="block text-outline hover:text-primary transition-colors text-xs font-bold" href="#">Community</Link>
              <Link className="block text-outline hover:text-primary transition-colors text-xs font-bold" href="#">Support</Link>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface mb-8">Services</h4>
              <Link className="block text-outline hover:text-primary transition-colors text-xs font-bold" href="#">Private Tours</Link>
              <Link className="block text-outline hover:text-primary transition-colors text-xs font-bold" href="#">Hotel Curation</Link>
              <Link className="block text-outline hover:text-primary transition-colors text-xs font-bold" href="#">Concierge</Link>
            </div>
          </div>
          <div className="md:col-span-1 space-y-8">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface">Newsletter</h4>
            <div className="flex gap-2 p-1.5 bg-background rounded-2xl border border-outline/10">
              <input className="bg-transparent px-4 py-2 flex-1 text-[11px] font-bold outline-none text-on-surface" placeholder="Your email" type="email" />
              <button className="bg-primary text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20">Join</button>
            </div>
            <p className="text-[10px] font-black text-outline uppercase tracking-[0.1em]">© 2024 HanoiGO. The Modern Archivist.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
