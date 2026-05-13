"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        setError(payload.message ?? "Login failed.");
        return;
      }
      const payload = (await response.json()) as { redirectPath: string };
      router.replace(payload.redirectPath);
    } catch {
      setError("Unable to connect. Check your network.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen w-full flex bg-[#050505] selection:bg-emerald-500/30">
      {/* Left Side - The Emerald Glow (hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-center px-12 xl:px-24 border-r border-white/5">
        {/* Massive blurred emerald background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#062415] via-[#051f15] to-[#050505]" />
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-emerald-500/20 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-green-600/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white text-black font-black text-2xl shadow-[0_0_30px_rgba(255,255,255,0.3)]">B</div>
            <span className="font-bold tracking-widest text-xl text-white">BILLY</span>
          </div>

          <h1 className="text-5xl xl:text-6xl font-bold text-white tracking-tight mb-6 leading-tight">
            Get Started <br />with Us
          </h1>
          <p className="text-lg text-white/50 mb-16 max-w-md font-medium leading-relaxed">
            Complete these easy steps to register and access your secure retail workspace.
          </p>

          {/* Steps indicators (visual only, like the screenshot) */}
          <div className="flex gap-4">
            <div className="bg-white rounded-[1.5rem] p-6 w-36 shadow-[0_0_40px_rgba(255,255,255,0.15)] transform transition-transform hover:-translate-y-1">
              <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold mb-5">1</div>
              <p className="text-black font-bold text-sm leading-tight">Sign up your<br/>account</p>
            </div>
            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-[1.5rem] p-6 w-36 transform transition-transform hover:-translate-y-1">
              <div className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px] font-bold mb-5">2</div>
              <p className="text-white/60 font-medium text-sm leading-tight">Set up your<br/>workspace</p>
            </div>
            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-[1.5rem] p-6 w-36 transform transition-transform hover:-translate-y-1">
              <div className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px] font-bold mb-5">3</div>
              <p className="text-white/60 font-medium text-sm leading-tight">Set up your<br/>profile</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - The Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-sm">
          {/* Mobile logo only */}
          <div className="flex lg:hidden justify-center mb-10">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 text-white font-black text-2xl shadow-xl">B</div>
          </div>

          <div className="text-center lg:text-left mb-10">
            <h2 className="text-3xl font-bold text-white tracking-tight">Sign Up Account</h2>
            <p className="mt-2 text-sm text-white/40 font-medium">Enter your personal data to create your account.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">Username</label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                autoFocus
                className="w-full rounded-2xl border border-white/10 bg-[#111111] px-4 py-4 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-emerald-500 focus:bg-[#151515] focus:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                placeholder="eg. john.francis"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-[#111111] px-4 py-4 pr-12 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-emerald-500 focus:bg-[#151515] focus:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/80 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={showPwd ? "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" : "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"}></path></svg>
                </button>
              </div>
              <p className="mt-2 text-[11px] text-white/30">Must be at least 6 characters.</p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-6 rounded-2xl bg-white py-4 text-sm font-bold text-black transition-all hover:bg-white/90 disabled:opacity-50 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-[0.98]"
            >
              {isSubmitting ? "Authenticating..." : "Sign Up / Log In"}
            </button>
          </form>
          
          <p className="mt-8 text-center text-sm text-white/40 font-medium">
            Already have an account? <span className="text-white hover:underline cursor-pointer">Log in</span>
          </p>
        </div>
      </div>
    </main>
  );
}
