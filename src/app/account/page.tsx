"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Order {
  id: number | string;
  order_number?: string;
  customer_phone: string;
  total?: number;
  total_amount?: number;
  payment_due?: number;
  status: string;
  created_at: string;
  school?: string;
  class_name?: string;
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; phone: string; role?: string } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Change Password states
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  useEffect(() => {
    const savedUser =
      localStorage.getItem("sb_current_user") || localStorage.getItem("sb_auth_user");
    if (!savedUser) {
      router.push("/Login");
      return;
    }

    const parsedUser = JSON.parse(savedUser);
    setUser(parsedUser);

    const fetchUserOrders = async () => {
      try {
        const cleaned = (parsedUser.phone || "").replace(/\D/g, "").slice(-10);
        const res = await fetch("/api/orders");
        const data = await res.json();

        if (res.ok && Array.isArray(data.orders)) {
          const userOrders = data.orders.filter(
            (o: Order) => (o.customer_phone || "").replace(/\D/g, "").slice(-10) === cleaned
          );
          setOrders(userOrders);
        }
      } catch (err) {
        console.error("Failed to load user orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserOrders();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {}
    localStorage.removeItem("sb_auth_user");
    localStorage.removeItem("sb_current_user");
    router.push("/Login");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (!user?.phone) return;

    if (newPassword.trim().length < 4 || newPassword.trim().length > 32) {
      setPwError("New password must be between 4 and 32 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError("New password and confirmation do not match.");
      return;
    }

    setPwLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_pin",
          phone: user.phone,
          pin: currentPassword,
          newPin: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password.");
      }

      setPwSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setShowPasswordForm(false);
        setPwSuccess("");
      }, 2000);
    } catch (err: any) {
      setPwError(err.message || "Error updating password.");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top Bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/schools" className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">
              📚
            </span>
            School <span className="text-indigo-600">Buddy</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/schools"
              className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition"
            >
              + New Book Order
            </Link>
            <Link href="/tracking" className="text-xs font-semibold text-slate-600 hover:text-indigo-600">
              Track Order
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 mb-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Parent Account
              </p>
              <h1 className="text-xl font-black text-slate-900">{user?.name || "Customer"}</h1>
              <p className="text-sm text-slate-500 font-mono">+91 {user?.phone}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm((prev) => !prev);
                  setPwError("");
                  setPwSuccess("");
                }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                {showPasswordForm ? "Cancel" : "Change Password"}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 transition cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Collapsible Change Password Form */}
          {showPasswordForm && (
            <form
              onSubmit={handleChangePassword}
              className="mt-6 pt-6 border-t border-slate-100 max-w-md space-y-4"
            >
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                Update Account Password
              </h2>

              {pwError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  ⚠️ {pwError}
                </div>
              )}

              {pwSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                  ✓ {pwSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  New Password (4–32 Characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  maxLength={32}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  maxLength={32}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={pwLoading}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer"
              >
                {pwLoading ? "Updating..." : "Save New Password"}
              </button>
            </form>
          )}
        </div>

        {/* Orders List */}
        <h2 className="text-lg font-bold text-slate-900 mb-4">Your Order History</h2>

        {loading ? (
          <p className="text-sm text-slate-500">Loading your past orders...</p>
        ) : orders.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
            <p className="text-slate-500 text-sm mb-4">No orders found for this account yet.</p>
            <Link
              href="/schools"
              className="inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
            >
              Browse Schools & Place First Order →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-4 border border-slate-200 rounded-xl bg-white shadow-xs flex flex-wrap justify-between items-center gap-4"
              >
                <div>
                  <p className="font-bold text-slate-900">
                    Order #{order.order_number || order.id}
                  </p>
                  {order.school && (
                    <p className="text-xs font-medium text-slate-600">
                      {order.school} {order.class_name ? `• ${order.class_name}` : ""}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-indigo-600">
                    ₹{order.total ?? order.total_amount ?? 0}
                  </p>
                  <span className="inline-block mt-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {order.status || "Order Placed"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}