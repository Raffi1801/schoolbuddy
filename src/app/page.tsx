"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Modes: "login" | "signup" | "forgot"
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sb_current_user");
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch {}
    setCheckingAuth(false);
  }, []);

  // Request OTP (Used for both Sign-up and Forgot PIN)
  async function handleSendOtp() {
    setAuthError("");
    setAuthSuccess("");

    const cleaned = phone.replace(/\D/g, "").slice(-10);
    if (cleaned.length !== 10) {
      setAuthError("Please enter a valid 10-digit mobile number first.");
      return;
    }

    setSendingOtp(true);
    try {
      let backupUsers: any[] = [];
      try {
        const stored = localStorage.getItem("sb_users_backup");
        if (stored) backupUsers = JSON.parse(stored);
      } catch {}

      // Fast client-side validations
      const alreadySaved = backupUsers.some(
        (u: any) => u.phone?.replace(/\D/g, "").slice(-10) === cleaned
      );

      if (authMode === "signup" && alreadySaved) {
        setAuthError("User already exists with this mobile number. Please sign in instead.");
        setSendingOtp(false);
        return;
      }

      if (authMode === "forgot" && backupUsers.length > 0 && !alreadySaved) {
        setAuthError("No account found with this number. Please register first.");
        setSendingOtp(false);
        return;
      }

      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_otp",
          purpose: authMode, // "signup" or "forgot"
          phone: cleaned,
          backupUsers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send OTP.");
      }

      setOtpSent(true);
      if (data.debugOtp) {
        setOtp(data.debugOtp);
        setAuthSuccess(`✓ OTP sent! (Demo Code: ${data.debugOtp})`);
      } else {
        setAuthSuccess(`✓ OTP has been sent to +91 ${cleaned}`);
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to send OTP.");
    } finally {
      setSendingOtp(false);
    }
  }

  // Handle Form Submit
  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);

    try {
      let backupUsers: any[] = [];
      try {
        const stored = localStorage.getItem("sb_users_backup");
        if (stored) backupUsers = JSON.parse(stored);
      } catch {}

      const cleaned = phone.replace(/\D/g, "").slice(-10);

      // Verify OTP was sent for signup or forgot pin
      if ((authMode === "signup" || authMode === "forgot") && !otpSent) {
        throw new Error("Please tap 'Send OTP' to verify your mobile number first.");
      }

      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: authMode === "forgot" ? "reset_pin" : authMode,
          name,
          phone: cleaned,
          pin,
          otp,
          backupUsers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      // Save user session
      localStorage.setItem("sb_current_user", JSON.stringify(data.user));
      setCurrentUser(data.user);

      // Persist user to local backup
      try {
        const filtered = backupUsers.filter(
          (u: any) => u.phone?.replace(/\D/g, "").slice(-10) !== cleaned
        );
        localStorage.setItem("sb_users_backup", JSON.stringify([...filtered, data.user]));
      } catch {}

      if (data.user.role === "admin") {
        router.push("/admin");
      }
    } catch (err: any) {
      setAuthError(err.message || "An error occurred");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("sb_current_user");
    setCurrentUser(null);
    setAuthMode("login");
    setOtpSent(false);
    setOtp("");
  }

  function switchMode(newMode: "login" | "signup" | "forgot") {
    setAuthMode(newMode);
    setAuthError("");
    setAuthSuccess("");
    setOtpSent(false);
    setOtp("");
    setPin("");
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 font-medium text-slate-500">
        Loading SchoolBuddy...
      </div>
    );
  }

  // 1. GATEWAY: Sign In / Create Account / Forgot PIN (All with OTP)
  if (!currentUser) {
    return (
      <main className="flex min-h-screen flex-col justify-center bg-slate-50 px-6 py-12 text-slate-900">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 text-3xl font-black text-slate-900">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-base text-white">
                📚
              </span>
              School<span className="text-indigo-600">Buddy</span>
            </div>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tuni Book Covering Service
            </p>
            <h2 className="mt-4 text-xl font-bold text-slate-900">
              {authMode === "login"
                ? "Sign in to continue"
                : authMode === "signup"
                ? "Create parent account"
                : "Reset Your Security PIN"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {authMode === "login"
                ? "Sign in with your registered phone and 4-digit PIN."
                : authMode === "signup"
                ? "Verify your mobile with OTP and set a 4-digit PIN."
                : "Verify your phone with OTP, then set a new PIN."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
            {authError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                ⚠️ {authError}
              </div>
            )}

            {authSuccess && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                {authSuccess}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {/* Name (Sign-up only) */}
              {authMode === "signup" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Parent or student name"
                    className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              )}

              {/* Mobile Number Field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Mobile Number
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-xl border border-slate-300 bg-slate-100 px-3 py-3 font-mono text-sm font-bold text-slate-700">
                    +91
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="10-digit number"
                    className="w-full rounded-xl border border-slate-300 p-3 font-mono text-sm tracking-wider focus:border-indigo-600 focus:outline-none"
                  />
                  {/* Send OTP button appears for both SIGNUP and FORGOT PIN */}
                  {(authMode === "signup" || authMode === "forgot") && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp || phone.length !== 10}
                      className="shrink-0 rounded-xl bg-slate-900 px-3 py-3 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40 transition"
                    >
                      {sendingOtp ? "Sending..." : otpSent ? "Resend" : "Send OTP"}
                    </button>
                  )}
                </div>
              </div>

              {/* OTP Field (Sign-up & Forgot PIN) */}
              {(authMode === "signup" || authMode === "forgot") && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Verification OTP
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 4-digit OTP"
                    className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-mono text-sm tracking-widest focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              )}

              {/* PIN Field */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    {authMode === "forgot" ? "New Security PIN (4 digits)" : "Security PIN (4 digits)"}
                  </label>
                  {authMode === "login" && (
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Forgot PIN?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-mono text-sm tracking-widest focus:border-indigo-600 focus:outline-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {authLoading
                  ? "Processing..."
                  : authMode === "login"
                  ? "Sign In"
                  : authMode === "signup"
                  ? "Verify OTP & Create Account"
                  : "Verify OTP & Save New PIN"}
              </button>
            </form>

            {/* Switch Mode Links */}
            <div className="mt-6 border-t border-slate-100 pt-4 flex flex-col gap-2 text-center text-xs">
              {authMode === "login" ? (
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="font-semibold text-indigo-600 hover:underline"
                >
                  New user? Create an account
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-semibold text-indigo-600 hover:underline"
                >
                  Already registered? Sign in
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 2. STOREFRONT: Visible after authenticating
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">
              📚
            </span>
            School<span className="text-indigo-600">Buddy</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/account"
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-200 transition"
            >
              👤 {currentUser.name || "My Account"}
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 pt-12 text-center sm:text-left">
        <div className="inline-block rounded-full bg-indigo-50 border border-indigo-200/80 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-indigo-700">
          Book Covering, Made Simple
        </div>
        <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight">
          We will make your Books ready For you...
        </h1>
        <p className="mt-4 text-base text-slate-600 max-w-2xl leading-relaxed">
          Choose your school and class, select the books you need, and let SchoolBuddy handle professional book covering with pickup, return, or convenient shop drop-off in Tuni.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/schools"
            className="rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            Find your school →
          </Link>
          <Link
            href="/tracking"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            Track Existing Order
          </Link>
        </div>

        <div className="mt-14 rounded-3xl bg-indigo-600 p-8 text-white shadow-md">
          <p className="text-xs uppercase tracking-wider font-extrabold text-indigo-200">
            SchoolBuddy Promise
          </p>
          <h2 className="mt-2 text-2xl font-black">
            Simple for parents. Organised for schools.
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-3 text-sm">
            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-xs border border-white/10">
              <h3 className="font-bold text-base">Choose suggested books</h3>
              <p className="mt-2 text-xs text-indigo-100 leading-relaxed">
                Each school and class has its own curated list with single-tap selections.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-xs border border-white/10">
              <h3 className="font-bold text-base">Pick a cover type</h3>
              <p className="mt-2 text-xs text-indigo-100 leading-relaxed">
                Normal (₹25), Premium (₹40), and Special (₹60) options with upfront transparent pricing.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-xs border border-white/10">
              <h3 className="font-bold text-base">Choose delivery your way</h3>
              <p className="mt-2 text-xs text-indigo-100 leading-relaxed">
                Shop drop-off or doorstep pickup and return within 15 km in Tuni.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}