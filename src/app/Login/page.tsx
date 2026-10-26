"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

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
        setOtp(data.debugOtp); // Auto-fills into OTP box for convenience
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
        setSuccess("PIN updated successfully! You can now sign in.");
        setTimeout(() => switchMode("login"), 1500);
        return;
      }

      if (data.user) {
        localStorage.setItem("sb_auth_user", JSON.stringify(data.user));
        if (data.user.role === "admin") {
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-xs uppercase font-extrabold tracking-wider text-indigo-600 mb-1">
            TUNI BOOK COVERING SERVICE
          </p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {mode === "login" && "Parent Sign In"}
            {mode === "signup" && "Create Parent Account"}
            {mode === "forgot" && "Reset Security PIN"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {mode === "login" && "Enter your 10-digit mobile number and PIN"}
            {mode === "signup" && "Verify your mobile with OTP and set a 4-digit PIN"}
            {mode === "forgot" && "Verify mobile with OTP and set a new 4-digit PIN"}
          </p>
        </div>

        {/* Demo OTP Banner at the Top */}
        {demoCode && (
          <div className="mb-5 rounded-2xl border-2 border-dashed border-indigo-400 bg-indigo-50/80 p-4 text-center">
            <span className="inline-block rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
              Demo Verification Code
            </span>
            <div className="my-1 font-mono text-3xl font-black tracking-[0.3em] text-indigo-950">
              {demoCode}
            </div>
            <p className="text-xs text-indigo-700 font-medium">
              Use this code in the verification OTP box below.
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
            ⚠️ {error}
          </div>
        )}

        {/* Success Alert */}
        {success && !demoCode && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
            ✓ {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Student / Parent Name"
                className="w-full rounded-xl border border-slate-300 p-3 text-slate-900 focus:border-indigo-600 focus:outline-none"
              />
            </div>
          )}

          {/* Mobile Number Field with Send OTP Button */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Mobile Number
            </label>
            <div className="flex gap-2">
              <div className="relative flex flex-1">
                <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 text-slate-600 font-semibold text-sm">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="6300702057"
                  className="w-full rounded-r-xl border border-slate-300 p-3 font-mono text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              {mode !== "login" && (
                <button
                  type="button"
                  disabled={otpLoading || phone.length !== 10}
                  onClick={handleSendOtp}
                  className="px-4 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl whitespace-nowrap transition"
                >
                  {otpLoading ? "Sending..." : demoCode ? "Resend" : "Send OTP"}
                </button>
              )}
            </div>
          </div>

          {/* Verification OTP Box (for Signup and Reset PIN) */}
          {mode !== "login" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Verification OTP
              </label>
              <input
                type="text"
                required
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 4-digit OTP"
                className="w-full rounded-xl border border-slate-300 p-3 font-mono text-slate-900 tracking-widest text-center text-lg focus:border-indigo-600 focus:outline-none"
              />
            </div>
          )}

          {/* Security PIN Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              {mode === "forgot" ? "New Security PIN (4 Digits)" : "Security PIN (4 Digits)"}
            </label>
            <input
              type="password"
              required
              maxLength={mode === "login" && phone === "9963458896" ? 30 : 4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full rounded-xl border border-slate-300 p-3 text-slate-900 tracking-widest text-center font-mono text-lg focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition duration-150 disabled:opacity-50"
          >
            {loading
              ? "Processing..."
              : mode === "login"
              ? "Sign In"
              : mode === "signup"
              ? "Verify OTP & Create Account"
              : "Verify OTP & Save New PIN"}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-sm space-y-2">
          {mode === "login" ? (
            <>
              <div>
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-xs font-semibold text-slate-500 hover:text-indigo-600"
                >
                  Forgot your PIN?
                </button>
              </div>
              <div className="text-slate-600">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="font-bold text-indigo-600 hover:underline"
                >
                  Register here
                </button>
              </div>
            </>
          ) : (
            <div className="text-slate-600">
              Already registered?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-bold text-indigo-600 hover:underline"
              >
                Sign in
              </button>
            </div>
          )}

          <div className="pt-2">
            <Link href="/" className="text-xs text-slate-400 hover:text-slate-700">
              ← Back to Shop Home
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}