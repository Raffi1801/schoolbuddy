"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect");

  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const switchMode = (newMode: "login" | "signup" | "forgot") => {
    setMode(newMode);
    setError("");
    setSuccess("");
    setDemoCode(null);
    setOtp("");
    setPin("");
  };

  const handleSendOtp = async () => {
    setError("");
    setSuccess("");
    setDemoCode(null);

    const cleaned = phone.replace(/\D/g, "").slice(-10);
    if (!cleaned || cleaned.length !== 10) {
      setError("Please enter a valid 10-digit mobile number before requesting an OTP.");
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_otp",
          phone: cleaned,
          purpose: mode === "forgot" ? "forgot" : "signup",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate OTP.");
      }

      if (data.debugOtp) {
        setDemoCode(data.debugOtp);
        setOtp(data.debugOtp);
      }
      setSuccess(`Verification code generated for +91 ${cleaned}`);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const action = mode === "forgot" ? "reset_pin" : mode;

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          name: mode === "signup" ? name : undefined,
          phone,
          otp: mode !== "login" ? otp : undefined,
          pin,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Request failed.");
      }

      if (mode === "forgot") {
        setSuccess("Password / PIN updated successfully! You can now sign in.");
        setTimeout(() => switchMode("login"), 1500);
        return;
      }

      if (data.user) {
        localStorage.setItem("sb_auth_user", JSON.stringify(data.user));
        localStorage.setItem("sb_current_user", JSON.stringify(data.user));

        if (redirectPath && redirectPath.startsWith("/")) {
          router.push(redirectPath);
        } else if (data.user.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/account");
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen bg-slate-950 bg-cover bg-center bg-no-repeat flex items-center justify-center p-4 text-slate-100"
      style={{ backgroundImage: "url('/images/schoolbuddy.jpg')" }}
    >
      {/* Subtle dark overlay so text and inputs remain sharp */}
      <div className="absolute inset-0 bg-slate-950/50" />

      {/* Frosted-Glass Login Card */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-cyan-500/25 bg-slate-950/75 p-8 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-xs uppercase font-extrabold tracking-wider text-cyan-400 mb-1">
            TUNI BOOK COVERING SERVICE
          </p>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {mode === "login" && "Parent Sign In"}
            {mode === "signup" && "Create Parent Account"}
            {mode === "forgot" && "Reset Security Password / PIN"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {mode === "login" && "Enter your 10-digit mobile number and password / PIN"}
            {mode === "signup" && "Verify your mobile with OTP and set a password / PIN"}
            {mode === "forgot" && "Verify mobile with OTP and set a new password / PIN"}
          </p>
        </div>

        {/* Demo OTP Banner at the Top */}
        {demoCode && (
          <div className="mb-5 rounded-2xl border border-dashed border-cyan-400/50 bg-cyan-950/50 p-4 text-center">
            <span className="inline-block rounded-full bg-cyan-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-950">
              Demo Verification Code
            </span>
            <div className="my-1 font-mono text-3xl font-black tracking-[0.3em] text-cyan-300">
              {demoCode}
            </div>
            <p className="text-xs text-cyan-200/80 font-medium">
              Use this code in the verification OTP box below.
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/15 p-3 text-sm font-semibold text-rose-300">
            ⚠️ {error}
          </div>
        )}

        {/* Success Alert */}
        {success && !demoCode && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-3 text-sm font-semibold text-emerald-300">
            ✓ {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Student / Parent Name"
                className="w-full rounded-xl border border-slate-700/80 bg-slate-900/85 p-3 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>
          )}

          {/* Mobile Number Field with Send OTP Button */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Mobile Number
            </label>
            <div className="flex gap-2">
              <div className="relative flex flex-1">
                <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-slate-700/80 bg-slate-900 text-slate-400 font-semibold text-sm">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="6300702057"
                  className="w-full rounded-r-xl border border-slate-700/80 bg-slate-900/85 p-3 font-mono text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              {mode !== "login" && (
                <button
                  type="button"
                  disabled={otpLoading || phone.length !== 10}
                  onClick={handleSendOtp}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 text-cyan-300 text-xs font-bold rounded-xl whitespace-nowrap transition cursor-pointer"
                >
                  {otpLoading ? "Sending..." : demoCode ? "Resend" : "Send OTP"}
                </button>
              )}
            </div>
          </div>

          {/* Verification OTP Box (for Signup and Reset PIN) */}
          {mode !== "login" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Verification OTP
              </label>
              <input
                type="text"
                required
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 4-digit OTP"
                className="w-full rounded-xl border border-slate-700/80 bg-slate-900/85 p-3 font-mono text-white placeholder-slate-500 tracking-widest text-center text-lg focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>
          )}

          {/* Security Password / PIN Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              {mode === "forgot"
                ? "New Password / PIN (4–32 Chars)"
                : "Password / Security PIN (4–32 Chars)"}
            </label>
            <input
              type="password"
              required
              minLength={4}
              maxLength={32}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-700/80 bg-slate-900/85 p-3 text-white placeholder-slate-500 tracking-widest text-center font-mono text-lg focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-cyan-500/25 transition duration-150 disabled:opacity-50 cursor-pointer"
          >
            {loading
              ? "Processing..."
              : mode === "login"
              ? "Sign In"
              : mode === "signup"
              ? "Verify OTP & Create Account"
              : "Verify OTP & Save New Password"}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-sm space-y-2">
          {mode === "login" ? (
            <>
              <div>
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-xs font-semibold text-slate-400 hover:text-cyan-400 cursor-pointer"
                >
                  Forgot your Password / PIN?
                </button>
              </div>
              <div className="text-slate-400">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="font-bold text-cyan-400 hover:underline cursor-pointer"
                >
                  Register here
                </button>
              </div>
            </>
          ) : (
            <div className="text-slate-400">
              Already registered?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-bold text-cyan-400 hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </div>
          )}

          <div className="pt-2">
            <Link href="/" className="text-xs text-slate-500 hover:text-cyan-300">
              ← Back to Shop Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-sm font-bold text-slate-400">
          Loading sign-in portal...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}