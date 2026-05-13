import Link from "next/link";
import { getSession } from "@/lib/session";

export default async function LandingPage() {
  const session = await getSession();

  const pricingPlans = [
    {
      name: "Starter",
      price: "₹999/mo",
      features: ["Single Shop", "Basic Billing", "Up to 500 items", "Email support"],
      color: "border-white/10"
    },
    {
      name: "Standard",
      price: "₹1,999/mo",
      features: ["2 Shops", "Advanced Billing", "Inventory Tracking", "WhatsApp Receipts"],
      color: "border-white/20"
    },
    {
      name: "Pro",
      price: "₹3,999/mo",
      features: ["Up to 5 Shops", "Full Analytics", "Staff Management", "Priority Support"],
      color: "border-emerald-500/50 relative shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]",
      badge: "Most Popular"
    },
    {
      name: "Elite",
      price: "Custom",
      features: ["Unlimited Shops", "Custom API", "Dedicated Account Manager", "White-label"],
      color: "border-teal-500/50"
    }
  ];

  return (
    <main className="min-h-screen bg-[#020806] text-white selection:bg-emerald-500/30 overflow-x-hidden font-sans">
      {/* Background Effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1400px] h-[800px] bg-emerald-600/10 blur-[150px] rounded-[100%]" />
        <div className="absolute top-[40%] left-[-10%] w-[600px] h-[600px] bg-teal-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-emerald-900/20 blur-[150px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-full border border-white/5 bg-[#020806]/60 backdrop-blur-xl px-2 py-2 w-[95%] max-w-5xl flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3 pl-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white font-black text-xl shadow-[0_0_15px_rgba(16,185,129,0.5)]">B</div>
          <span className="font-bold tracking-widest text-lg text-white">BILLY</span>
        </div>
        
        <div className="hidden md:flex items-center gap-10 text-sm font-semibold text-white/60">
          <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-emerald-400 transition-colors">Pricing</a>
        </div>

        <div className="flex items-center gap-3">
          {session ? (
            <Link href={session.role === "admin" ? "/admin" : "/shop"} className="rounded-full bg-white/10 border border-white/10 px-6 py-2.5 text-sm font-medium hover:bg-white/20 transition">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="rounded-full bg-emerald-600 px-7 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 transition shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              Get Started →
            </Link>
          )}
        </div>
      </nav>

      <div className="relative pt-40 pb-20 px-6 max-w-6xl mx-auto z-10">
        
        {/* Hero Section */}
        <section className="text-center max-w-5xl mx-auto mb-20 relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold mb-8 backdrop-blur-sm text-emerald-300">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,1)]"></span>
            v2.0 is now live — Lightning Fast POS
          </div>
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-8 leading-[1.05]">
            Run your retail shop <br className="hidden lg:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-300 to-emerald-600">
              without the chaos.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/60 mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
            Spot market trends, handle massive inventories, and process split payments in seconds. A premium suite of tools designed for modern shop owners.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="w-full sm:w-auto rounded-full bg-emerald-600 px-8 py-4 text-sm uppercase tracking-wider font-bold text-white hover:bg-emerald-500 transition-all shadow-[0_0_40px_-5px_rgba(16,185,129,0.4)]">
              Start your free trial
            </Link>
            <a href="#how-it-works" className="w-full sm:w-auto rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-8 py-4 text-sm uppercase tracking-wider font-bold hover:bg-white/10 transition-colors">
              See How It Works
            </a>
          </div>
        </section>

        {/* Dashboard Preview Image/Mockup */}
        <section className="mb-20 relative flex justify-center">
          <div className="absolute inset-0 bg-gradient-to-t from-[#020806] via-transparent to-transparent z-10 pointer-events-none" />
          <div className="w-full max-w-5xl rounded-[2rem] border border-white/10 bg-[#05100c]/80 backdrop-blur-2xl p-4 lg:p-6 shadow-[0_0_80px_rgba(16,185,129,0.15)] relative overflow-hidden transform perspective-1000 rotate-x-2 scale-100 transition-transform duration-700 hover:rotate-x-0">
            {/* Top Bar of Fake Window */}
            <div className="flex gap-2 mb-6 px-2">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>
            {/* Fake Dashboard UI */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 px-2 pb-2 opacity-90">
              {/* Sidebar */}
              <div className="hidden lg:flex flex-col gap-3">
                <div className="h-12 rounded-xl bg-white/5 w-full mb-4 border border-white/5" />
                <div className="h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 w-full" />
                <div className="h-10 rounded-lg bg-white/5 w-3/4" />
                <div className="h-10 rounded-lg bg-white/5 w-5/6" />
                <div className="h-10 rounded-lg bg-white/5 w-2/3" />
              </div>
              {/* Main Content */}
              <div className="lg:col-span-3 flex flex-col gap-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1,2,3,4].map(i => (
                     <div key={i} className="h-32 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5 flex flex-col justify-end">
                       <div className="h-4 bg-white/20 w-1/3 rounded-full mb-3" />
                       <div className="h-8 bg-white/60 w-2/3 rounded-full" />
                     </div>
                  ))}
                </div>
                <div className="h-80 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 relative overflow-hidden flex items-end p-6">
                   <div className="absolute top-6 left-6 h-6 w-1/4 bg-white/20 rounded-full" />
                   {/* Fake Chart bars */}
                   <div className="w-full flex items-end justify-between gap-2 h-48 opacity-50">
                     {[40, 70, 45, 90, 65, 80, 55, 100, 75].map((h, i) => (
                        <div key={i} className="w-full bg-emerald-500 rounded-t-sm" style={{ height: `${h}%` }} />
                     ))}
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="mb-32 flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24 border-y border-white/5 py-12 bg-white/[0.02]">
          <div className="text-center">
            <p className="text-xs text-emerald-400 uppercase tracking-widest font-bold mb-2">Total Shops</p>
            <h3 className="text-5xl font-black text-white tracking-tighter">10,000+</h3>
          </div>
          <div className="hidden md:block w-px h-16 bg-white/10" />
          <div className="text-center">
            <p className="text-xs text-emerald-400 uppercase tracking-widest font-bold mb-2">Uptime Reliability</p>
            <h3 className="text-5xl font-black text-white tracking-tighter">99.9%</h3>
          </div>
          <div className="hidden md:block w-px h-16 bg-white/10" />
          <div className="text-center">
            <p className="text-xs text-emerald-400 uppercase tracking-widest font-bold mb-2">Automated Tasks</p>
            <h3 className="text-5xl font-black text-white tracking-tighter">24/7</h3>
          </div>
        </section>

        {/* How It Works (1-2-3 Section) */}
        <section id="how-it-works" className="mb-32">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-semibold mb-4 text-white/60">
              Workflow
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-white/50 max-w-2xl mx-auto">From creating an account to accepting your first payment in less than 5 minutes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {[
              { num: "1", title: "Setup", desc: "Create your shop profile and invite your staff members with role-based access." },
              { num: "2", title: "Import", desc: "Upload your entire inventory via CSV or add items instantly using smart categories." },
              { num: "3", title: "Execute", desc: "Start billing using the lightning-fast keyboard interface and accept split payments." }
            ].map((step, i) => (
              <div key={i} className="relative p-8 rounded-[2rem] border border-white/10 bg-[#05100c] overflow-hidden group hover:border-emerald-500/50 transition-colors">
                {/* Huge Number Watermark */}
                <div className="absolute -right-4 -bottom-10 text-[180px] font-black text-emerald-500/5 leading-none group-hover:text-emerald-500/10 transition-colors select-none">
                  {step.num}
                </div>
                <div className="relative z-10">
                  <p className="text-xs text-emerald-400 font-bold tracking-widest mb-4 uppercase">Step-0{step.num}</p>
                  <h3 className="text-2xl font-bold mb-3 text-white">{step.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features Toolkit / Bento Grid */}
        <section id="features" className="mb-32">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-semibold mb-4 text-white/60">
              Toolkit
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">What is BILLY?</h2>
            <p className="text-white/50 max-w-2xl mx-auto">A tactical suite of tools designed to optimize retail workflows and increase revenue.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            {/* Feature 1 (Large) */}
            <div className="md:col-span-4 p-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#05100c] to-[#020806] relative overflow-hidden group">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 relative z-10">
                <span className="text-3xl drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]">⚡</span>
              </div>
              <h3 className="text-2xl font-bold mb-3 relative z-10">Lightning Fast Billing</h3>
              <p className="text-white/50 text-sm leading-relaxed max-w-md relative z-10">Keyboard-first interface designed for high-volume stores. Use shortcut keys to add items, switch to rush mode during busy hours, and never keep a customer waiting.</p>
            </div>

            {/* Feature 2 */}
            <div className="md:col-span-2 p-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#05100c] to-[#020806] relative overflow-hidden group">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 relative z-10">
                <span className="text-3xl drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]">📊</span>
              </div>
              <h3 className="text-xl font-bold mb-3 relative z-10">Real-time Analytics</h3>
              <p className="text-white/50 text-sm leading-relaxed relative z-10">Stunning dashboard with instant insights into your daily revenue and payment methods.</p>
            </div>

            {/* Feature 3 */}
            <div className="md:col-span-2 p-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#05100c] to-[#020806] relative overflow-hidden group">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 relative z-10">
                <span className="text-3xl drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]">💳</span>
              </div>
              <h3 className="text-xl font-bold mb-3 relative z-10">Split Payments</h3>
              <p className="text-white/50 text-sm leading-relaxed relative z-10">Accept Cash + UPI perfectly and auto-calculate remaining balances instantly.</p>
            </div>

            {/* Feature 4 (Large) */}
            <div className="md:col-span-4 p-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#05100c] to-[#020806] relative overflow-hidden group">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-teal-500/10 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 relative z-10">
                <span className="text-3xl drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]">👥</span>
              </div>
              <h3 className="text-2xl font-bold mb-3 relative z-10">Advanced Staff Control</h3>
              <p className="text-white/50 text-sm leading-relaxed max-w-md relative z-10">Create restricted access roles so your cashiers only see the billing screen, while you maintain full control over inventory, reports, and shop settings.</p>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="mb-32">
           <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-semibold mb-4 text-white/60">
              Testimonials
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">What Our Users<br/>Are Saying</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Jacob Jones", handle: "@jacobjones", text: "Before BILLY, I was buried under a pile of sticky notes and to-do lists. Now, everything is organized, prioritized, and handled—without me lifting a finger.", icon: "👨" },
              { name: "Kathryn Murphy", handle: "@katmurphy", text: "The moment I open my shop, BILLY already has my day structured. Inventory is tracked, bills are fast. It's like it knows my business better than I do.", icon: "👩" },
              { name: "Jerome Bell", handle: "@jeromebell", text: "My checkout line used to control me—now I control it. The rush mode feature blocks time efficiently, giving me space to focus. I'm more productive and less stressed.", icon: "👨‍🦱" },
              { name: "Bessie Cooper", handle: "@bessie", text: "Juggling multiple shops used to be a mess. The global analytics dashboard helps me stay on track—and deliver on time, every time. It feels like I hired an assistant.", icon: "👩‍🦰" },
              { name: "Ronald Richards", handle: "@ronald", text: "Our staff productivity skyrocketed after using BILLY. Everyone is more aligned, focused, and collaborative. The reports remove all the guesswork.", icon: "👨‍🦳" },
              { name: "Wade Warren", handle: "@wade", text: "It doesn't just manage my inventory, it protects it. I get precise sales reports, gentle nudges, and clear priorities—so my revenue is higher.", icon: "👱‍♂️" }
            ].map((t, i) => (
              <div key={i} className="p-6 rounded-3xl border border-emerald-900/50 bg-gradient-to-b from-emerald-950/30 to-black/50 backdrop-blur-sm flex flex-col hover:border-emerald-500/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-900 flex items-center justify-center text-xl">{t.icon}</div>
                  <div>
                    <h4 className="text-sm font-bold flex items-center gap-1">{t.name} <span className="text-emerald-500 text-xs">✓</span></h4>
                    <p className="text-xs text-white/30">{t.handle}</p>
                  </div>
                </div>
                <p className="text-sm text-white/70 leading-relaxed font-medium">"{t.text}"</p>
              </div>
            ))}
          </div>
          
          <div className="flex justify-center mt-10">
            <button className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-2 text-xs font-semibold hover:bg-white/10 transition-colors">
              See All
              <span className="text-emerald-500">→</span>
            </button>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mb-20">
          <div className="text-center mb-16 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-semibold mb-4 text-white/60 relative z-10">
              Pricing Plans
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4 relative z-10">Choose the <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-400">Plan</span></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {pricingPlans.map((plan, i) => (
              <div key={i} className={`p-8 rounded-[2rem] border bg-[#030c08] backdrop-blur-xl flex flex-col transition-all hover:-translate-y-2 hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)] ${plan.color}`}>
                {plan.badge && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-bold uppercase tracking-widest py-1.5 px-4 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                    {plan.badge}
                  </span>
                )}
                <h3 className="text-2xl font-medium mb-2 text-white/90">{plan.name}</h3>
                <div className="text-4xl font-bold mb-8 tracking-tight">{plan.price}</div>
                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm text-white/60">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">✓</div> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className={`w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-wider text-center transition-all ${plan.badge ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]" : "bg-white/5 hover:bg-white/10 text-white border border-white/10"}`}>
                  Choose Plan
                </Link>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#020806] py-12 px-6 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-gradient-to-br from-emerald-400 to-teal-600 text-white font-black text-sm">B</div>
            <span className="font-bold tracking-wider text-base">BILLY POS</span>
          </div>
          <p className="text-sm text-white/30 font-medium">© {new Date().getFullYear()} BILLY POS. All rights reserved.</p>
          <div className="flex gap-6 text-sm font-medium text-white/50">
            <a href="#" className="hover:text-emerald-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
