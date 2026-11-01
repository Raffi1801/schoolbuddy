"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface School {
  id: string | number;
  name: string;
  location?: string;
  area?: string;
  subjects?: string[];
}

interface OrderItem {
  id: number;
  order_number: string;
  school: string;
  class_name: string;
  books: string;
  cover: string;
  delivery: string;
  required_date: string;
  customer_name: string;
  customer_phone: string;
  address?: string;
  total: number;
  payment_due: number;
  payment_type: string;
  status: string;
  created_at: string;
}

interface SettingsState {
  prices: {
    Normal: number;
    Premium: number;
    Special: number;
    ratePerKm: number;
  };
  defaultDailyLimit: number;
  dateLimits: Record<string, number>;
  inventory: Record<string, { stock: number; inStock: boolean }>;
}

const STATUS_OPTIONS = [
  "Order Placed",
  "In Progress",
  "Ready for Pickup",
  "Out for Delivery",
  "Completed",
  "Cancelled",
];

const COMMON_BOOK_SUGGESTIONS = [
  "Telugu Reader",
  "Telugu Work Book",
  "Hindi Reader",
  "Hindi Grammar",
  "English Reader",
  "English Grammar",
  "English Work Book",
  "Mathematics",
  "Mathematics Work Book",
  "General Science",
  "Physical Science",
  "Biological Science",
  "Social Studies",
  "Environmental Studies (EVS)",
  "Computer Science",
  "Information Technology",
  "Drawing & Art",
  "General Knowledge (GK)",
  "Moral Science",
  "Class Work NoteBook (CW)",
  "Home Work NoteBook (HW)",
  "Rough NoteBook",
  "Graph Book",
  "Practical Record Book",
];

export default function AdminPage() {
  const router = useRouter();

  // Security & Auth State
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [adminPhone, setAdminPhone] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Navigation
  const [selectedBox, setSelectedBox] = useState<
    "overview" | "bookings" | "schools" | "settings"
  >("overview");

  // Orders State
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  // Schools State
  const [schools, setSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolLocation, setNewSchoolLocation] = useState("Tuni");
  const [newBookInputs, setNewBookInputs] = useState<{ [key: string | number]: string }>({});

  // Settings & Date Limits State
  const [settings, setSettings] = useState<SettingsState>({
    prices: { Normal: 25, Premium: 40, Special: 60, ratePerKm: 18 },
    defaultDailyLimit: 10,
    dateLimits: {},
    inventory: {},
  });
  const [newOverrideDate, setNewOverrideDate] = useState("");
  const [newOverrideLimit, setNewOverrideLimit] = useState(10);
  const [savingSettings, setSavingSettings] = useState(false);
  const [message, setMessage] = useState("");

  // Check active admin session on load
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sb_current_user");
      if (stored) {
        const user = JSON.parse(stored);
        if (user.role === "admin") {
          setIsAdminAuth(true);
        }
      }
    } catch {}
    setAuthChecking(false);
  }, []);

  async function fetchOrders() {
    setLoadingOrders(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      const serverOrders: OrderItem[] = data.orders || (Array.isArray(data) ? data : []);
      serverOrders.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setOrders(serverOrders);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  }

  async function fetchSchools() {
    setLoadingSchools(true);
    try {
      const res = await fetch("/api/schools");
      const data = await res.json();
      const serverSchools = data.schools || [];

      const formatted: School[] = serverSchools.map((s: any) => ({
        id: s.id,
        name: s.name,
        location: s.location || "Tuni",
        area: s.location || "Tuni",
        subjects: Array.isArray(s.subjects)
          ? s.subjects
          : typeof s.subjects === "string"
          ? JSON.parse(s.subjects || "[]")
          : [],
      }));

      setSchools(formatted);
    } catch (err) {
      console.error("Failed to fetch schools:", err);
      setSchools([]);
    } finally {
      setLoadingSchools(false);
    }
  }

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) return;
      const data = await res.json();
      if (data?.settings) {
        setSettings({
          ...data.settings,
          dateLimits: data.settings.dateLimits || {},
        });
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  }

  useEffect(() => {
    if (isAdminAuth) {
      fetchOrders();
      fetchSchools();
      fetchSettings();
    }
  }, [isAdminAuth]);

  // Admin Login Handler
  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const cleaned = adminPhone.replace(/\D/g, "").slice(-10);

      const ADMIN_PHONE = "9963458896";
      const ADMIN_PIN = "Mustaffa@2026";

      if (cleaned === ADMIN_PHONE && adminPin === ADMIN_PIN) {
        const adminSession = {
          phone: cleaned,
          name: "Shop Admin",
          role: "admin",
        };
        localStorage.setItem("sb_current_user", JSON.stringify(adminSession));
        setIsAdminAuth(true);
      } else {
        throw new Error("Invalid mobile number or administrator PIN.");
      }
    } catch (err: any) {
      setLoginError(err.message || "Invalid administrator credentials.");
    } finally {
      setLoginLoading(false);
    }
  }

  function handleAdminLogout() {
    localStorage.removeItem("sb_current_user");
    setIsAdminAuth(false);
    setAdminPin("");
    setSelectedBox("overview");
  }

  const pendingOrdersCount = useMemo(() => {
    return orders.filter(
      (o) => o.status !== "Completed" && o.status !== "Cancelled"
    ).length;
  }, [orders]);

  const datesSummary = useMemo(() => {
    const bookedCounts: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.required_date && o.status !== "Cancelled") {
        bookedCounts[o.required_date] = (bookedCounts[o.required_date] || 0) + 1;
      }
    });

    const allDateKeys = Array.from(
      new Set([...Object.keys(bookedCounts), ...Object.keys(settings.dateLimits || {})])
    ).sort();

    return allDateKeys.map((dateStr) => {
      const count = bookedCounts[dateStr] || 0;
      const limit = settings.dateLimits?.[dateStr] ?? settings.defaultDailyLimit ?? 10;
      const hasCustom = settings.dateLimits && dateStr in settings.dateLimits;
      return { dateStr, count, limit, hasCustom };
    });
  }, [orders, settings]);

  async function handleStatusChange(orderNumber: string, newStatus: string) {
    setUpdatingId(orderNumber);
    try {
      const updated = orders.map((o) => {
        if (o.order_number === orderNumber) {
          if (newStatus === "Cancelled") {
            return {
              ...o,
              status: newStatus,
              payment_due: 0,
              payment_type: "Order Cancelled - Payment Not Required",
            };
          }
          return { ...o, status: newStatus };
        }
        return o;
      });

      setOrders(updated);

      await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, status: newStatus }),
      });

      setMessage(`Order #${orderNumber} marked as "${newStatus}"`);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handlePayDueAmount(orderNumber: string) {
    if (!confirm(`Mark full balance collected for Order #${orderNumber}?`)) return;
    setPayingId(orderNumber);
    try {
      const updated = orders.map((o) =>
        o.order_number === orderNumber
          ? { ...o, payment_due: 0, payment_type: "Full Payment Settled (Paid)" }
          : o
      );
      setOrders(updated);

      await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, action: "pay_due" }),
      });

      setMessage(`✓ Order #${orderNumber} fully settled and updated!`);
      setTimeout(() => setMessage(""), 3500);
    } catch (err) {
      console.error(err);
    } finally {
      setPayingId(null);
    }
  }

  async function saveSettingsPayload(newSettings: SettingsState) {
    setSavingSettings(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
      setMessage("✓ Updated settings and date limits successfully!");
      setTimeout(() => setMessage(""), 3500);
    } catch {
      setMessage("Failed to save settings to server.");
    } finally {
      setSavingSettings(false);
    }
  }

  function handleAddDateLimit(e: React.FormEvent) {
    e.preventDefault();
    if (!newOverrideDate) return;

    const updated = {
      ...settings,
      dateLimits: {
        ...(settings.dateLimits || {}),
        [newOverrideDate]: Number(newOverrideLimit),
      },
    };
    setSettings(updated);
    saveSettingsPayload(updated);
    setNewOverrideDate("");
  }

  function handleRemoveDateLimit(dateStr: string) {
    const copy = { ...(settings.dateLimits || {}) };
    delete copy[dateStr];
    const updated = { ...settings, dateLimits: copy };
    setSettings(updated);
    saveSettingsPayload(updated);
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    saveSettingsPayload(settings);
  }

  // --- Dynamic Schools & Subjects Management (Database Only) ---
  async function handleAddSchool(e: React.FormEvent) {
    e.preventDefault();
    if (!newSchoolName.trim()) return;

    try {
      const res = await fetch("/api/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSchoolName.trim(),
          location: newSchoolLocation.trim() || "Tuni",
          subjects: [],
        }),
      });

      const data = await res.json();
      if (res.ok && data.school) {
        const addedSchool: School = {
          id: data.school.id,
          name: data.school.name,
          location: data.school.location || "Tuni",
          area: data.school.location || "Tuni",
          subjects: [],
        };
        setSchools((prev) => [...prev, addedSchool]);
        setNewSchoolName("");
        setMessage(`✓ Added school "${addedSchool.name}" to database.`);
        setTimeout(() => setMessage(""), 3000);
      } else {
        alert(data.error || "Failed to add school.");
      }
    } catch {
      alert("Network error: Could not save school.");
    }
  }

  async function handleDeleteSchool(id: string | number) {
    if (!confirm("Are you sure you want to permanently delete this school?")) return;
    try {
      const res = await fetch("/api/schools", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setSchools((prev) => prev.filter((s) => s.id !== id));
        setMessage("✓ School deleted from database.");
        setTimeout(() => setMessage(""), 3000);
      } else {
        alert("Failed to delete school.");
      }
    } catch {
      alert("Network error: Could not delete school.");
    }
  }

  async function handleAddBookToSchool(schoolId: string | number) {
    const bookTitle = (newBookInputs[schoolId] || "").trim();
    if (!bookTitle) return;

    const targetSchool = schools.find((s) => s.id === schoolId);
    if (!targetSchool) return;

    const updatedSubjects = [...(targetSchool.subjects || []), bookTitle];

    try {
      const res = await fetch("/api/schools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: schoolId, subjects: updatedSubjects }),
      });

      if (res.ok) {
        setSchools((prev) =>
          prev.map((s) => (s.id === schoolId ? { ...s, subjects: updatedSubjects } : s))
        );
        setNewBookInputs((prev) => ({ ...prev, [schoolId]: "" }));
      } else {
        alert("Failed to add book.");
      }
    } catch {
      alert("Network error: Could not add book.");
    }
  }

  async function handleDeleteBookFromSchool(schoolId: string | number, index: number) {
    const targetSchool = schools.find((s) => s.id === schoolId);
    if (!targetSchool) return;

    const updatedSubjects = (targetSchool.subjects || []).filter((_, i) => i !== index);

    try {
      const res = await fetch("/api/schools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: schoolId, subjects: updatedSubjects }),
      });

      if (res.ok) {
        setSchools((prev) =>
          prev.map((s) => (s.id === schoolId ? { ...s, subjects: updatedSubjects } : s))
        );
      } else {
        alert("Failed to remove book.");
      }
    } catch {
      alert("Network error: Could not remove book.");
    }
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        o.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customer_phone?.includes(searchTerm);
      const matchesStatus = filterStatus === "All" || o.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, filterStatus]);

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm font-bold text-slate-500">
        Verifying security clearance...
      </div>
    );
  }

  // -------------------------------------------------------------
  // SECURITY GATEWAY: ADMIN LOGIN SCREEN
  // -------------------------------------------------------------
  if (!isAdminAuth) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-6 py-12 text-slate-100">
        <div className="mx-auto w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-2xl text-white font-black shadow-lg shadow-indigo-600/30">
              ⚡
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-white">
              SchoolBuddy Admin Portal
            </h1>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Restricted Shop Management Access
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 shadow-2xl backdrop-blur-md">
            {loginError && (
              <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs font-bold text-red-400">
                ⚠️ {loginError}
              </div>
            )}

            <form onSubmit={handleAdminLogin} autoComplete="off" className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Admin Registered Mobile Number
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-3 font-mono text-xs font-bold text-slate-400">
                    +91
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    inputMode="numeric"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/90 p-3 font-mono text-sm tracking-wider text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Administrator Password
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-900/90 p-3 font-mono text-sm tracking-wider text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading || adminPhone.length !== 10 || !adminPin}
                className="w-full rounded-xl bg-indigo-600 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-indigo-500 disabled:opacity-40 transition cursor-pointer"
              >
                {loginLoading ? "Verifying..." : "Authorize Admin Session"}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
              <Link
                href="/"
                className="text-xs font-semibold text-slate-400 hover:text-indigo-400"
              >
                ← Return to Public Storefront
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------
  // AUTHORIZED ADMIN PANEL
  // -------------------------------------------------------------
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 pb-24">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-700 text-base text-white font-black">
              ⚡
            </span>
            <div>
              <h1 className="text-xl font-black text-slate-900">
                School<span className="text-indigo-600">Buddy</span> Admin
              </h1>
              <p className="text-[11px] font-medium text-slate-500">
                Authenticated Session
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              Storefront ↗
            </Link>
            <button
              onClick={handleAdminLogout}
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition cursor-pointer"
            >
              Lock & Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 pt-8 space-y-6">
        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 shadow-xs">
            {message}
          </div>
        )}

        {/* OVERVIEW: 3 SELECTION BOXES */}
        {selectedBox === "overview" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Admin Control Desk</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select a section to manage records.
              </p>
            </div>

            <div className="flex flex-col gap-4 max-w-xl">
              {/* BOX 1: BOOKINGS */}
              <div
                onClick={() => setSelectedBox("bookings")}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-indigo-600 hover:shadow-md hover:ring-2 hover:ring-indigo-100"
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">📋</span>
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">
                    {pendingOrdersCount} Pending
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-black text-slate-900">Bookings List</h3>
                <p className="text-xs text-slate-500 mt-1">
                  View orders, update progress, and settle pending payments.
                </p>
              </div>

              {/* BOX 2: SCHOOLS & SUBJECTS */}
              <div
                onClick={() => setSelectedBox("schools")}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-indigo-600 hover:shadow-md hover:ring-2 hover:ring-indigo-100"
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">🏫</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {schools.length} Schools
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-black text-slate-900">
                  Manage Schools & Subjects
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Add or delete schools and edit curriculum syllabus books shown to parents.
                </p>
              </div>

              {/* BOX 3: PRICES & CAPACITY */}
              <div
                onClick={() => setSelectedBox("settings")}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-indigo-600 hover:shadow-md hover:ring-2 hover:ring-indigo-100"
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">⚙️</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-mono font-bold text-slate-800">
                    Default: {settings.defaultDailyLimit || 10}/day
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-black text-slate-900">
                  Prices & Daily Delivery Limit
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Adjust per-date order limits, delivery rates, and cover prices.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 1: BOOKINGS LIST */}
        {selectedBox === "bookings" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <button
                  type="button"
                  onClick={() => setSelectedBox("overview")}
                  className="text-xs font-bold text-indigo-600 hover:underline mb-1 inline-flex items-center gap-1 cursor-pointer"
                >
                  ← Back to Overview
                </button>
                <h3 className="text-2xl font-black text-slate-900">Customer Bookings</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {pendingOrdersCount} pending active orders ({orders.length} total).
                </p>
              </div>

              <input
                type="text"
                placeholder="Search Order ID, Name, Phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-56 sm:w-64 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {["All", ...STATUS_OPTIONS].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    filterStatus === st
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {loadingOrders ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Loading bookings from database...
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-xs text-slate-400">
                  No orders match your filter.
                </div>
              ) : (
                filteredOrders.map((o) => (
                  <div
                    key={o.order_number}
                    className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 shadow-2xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-900">
                          #{o.order_number}
                        </span>
                        <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {o.school} · {o.class_name}
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded">
                          📅 Target: {o.required_date}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {o.payment_due === 0 ? (
                          <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                            ✓ Payment Done
                          </span>
                        ) : (
                          <span className="rounded-md bg-amber-100 border border-amber-300 px-2.5 py-1 text-xs font-bold text-amber-900">
                            ₹{o.payment_due} Due
                          </span>
                        )}

                        <select
                          value={o.status}
                          disabled={updatingId === o.order_number}
                          onChange={(e) =>
                            handleStatusChange(o.order_number, e.target.value)
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                        >
                          {STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 text-xs">
                      <div>
                        <p className="text-slate-400 font-bold uppercase">Customer</p>
                        <p className="font-bold text-slate-900 text-sm mt-0.5">
                          {o.customer_name}
                        </p>
                        <p className="text-slate-500 font-mono">{o.customer_phone}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase">
                          Delivery & Address
                        </p>
                        <p className="font-bold text-slate-800 text-sm mt-0.5">
                          {o.delivery}
                        </p>
                        <p className="text-slate-500">{o.address || "Shop pickup"}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase">Billing</p>
                        <p className="font-black text-slate-900 text-base mt-0.5">
                          Total: ₹{o.total}{" "}
                          <span className="text-xs font-normal text-slate-500">
                            (Due: ₹{o.payment_due})
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500">{o.payment_type}</p>
                      </div>
                    </div>

                    {o.payment_due > 0 && (
                      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
                        <div className="flex items-center gap-2 text-xs text-amber-950 font-bold">
                          <span>💰 Balance Pending:</span>
                          <span className="font-mono text-sm text-indigo-800">
                            ₹{o.payment_due}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={payingId === o.order_number}
                          onClick={() => handlePayDueAmount(o.order_number)}
                          className="shrink-0 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
                        >
                          {payingId === o.order_number
                            ? "Updating..."
                            : `✓ Mark ₹${o.payment_due} Paid`}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* VIEW 2: SCHOOLS & SUBJECTS (STRICTLY FROM DATABASE) */}
        {selectedBox === "schools" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <button
                  type="button"
                  onClick={() => setSelectedBox("overview")}
                  className="text-xs font-bold text-indigo-600 hover:underline mb-1 inline-flex items-center gap-1 cursor-pointer"
                >
                  ← Back to Overview
                </button>
                <h3 className="text-2xl font-black text-slate-900">
                  Schools & Syllabus Subjects
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Schools catalog and configured curriculum syllabus books stored in your database.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {schools.length} Schools Listed
              </span>
            </div>

            {/* Dynamic Add School Form */}
            <form onSubmit={handleAddSchool} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Enter new school name (e.g. Kendriya Vidyalaya)..."
                value={newSchoolName}
                onChange={(e) => setNewSchoolName(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-indigo-600 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Town/Area (default: Tuni)"
                value={newSchoolLocation}
                onChange={(e) => setNewSchoolLocation(e.target.value)}
                className="w-full sm:w-40 rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-indigo-600 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition cursor-pointer"
              >
                + Add School
              </button>
            </form>

            <div className="divide-y divide-slate-100">
              {loadingSchools ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  Loading schools from database...
                </p>
              ) : schools.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  No schools found in database. Add a school using the form above.
                </p>
              ) : (
                schools.map((s) => (
                  <div key={s.id} className="py-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{s.name}</h4>
                        <p className="text-xs text-slate-400">
                          {s.location || s.area || "Tuni"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSchool(s.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition cursor-pointer"
                      >
                        Delete School
                      </button>
                    </div>

                    {/* Book / Subject Badges with Delete Button */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(s.subjects || []).length === 0 ? (
                        <span className="text-xs text-slate-400 italic">
                          No books added yet. Add books below.
                        </span>
                      ) : (
                        (s.subjects || []).map((sub, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1 text-xs font-medium text-blue-700"
                          >
                            {sub}
                            <button
                              type="button"
                              onClick={() => handleDeleteBookFromSchool(s.id, idx)}
                              className="text-blue-400 hover:text-red-600 font-bold cursor-pointer text-xs leading-none"
                              title="Delete this book"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    {/* Add Book Input with Suggestions */}
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="text"
                        list={`book-suggestions-${s.id}`}
                        placeholder="Type or select a book/subject..."
                        value={newBookInputs[s.id] || ""}
                        onChange={(e) =>
                          setNewBookInputs({ ...newBookInputs, [s.id]: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddBookToSchool(s.id);
                          }
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-indigo-600 focus:outline-none w-72"
                      />

                      <datalist id={`book-suggestions-${s.id}`}>
                        {COMMON_BOOK_SUGGESTIONS.filter(
                          (suggestion) => !(s.subjects || []).includes(suggestion)
                        ).map((suggestion) => (
                          <option key={suggestion} value={suggestion} />
                        ))}
                      </datalist>

                      <button
                        type="button"
                        onClick={() => handleAddBookToSchool(s.id)}
                        className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-black transition cursor-pointer"
                      >
                        + Add Book
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* VIEW 3: PRICES & DAILY DELIVERY LIMIT */}
        {selectedBox === "settings" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-8">
            <div className="border-b border-slate-100 pb-4">
              <button
                type="button"
                onClick={() => setSelectedBox("overview")}
                className="text-xs font-bold text-indigo-600 hover:underline mb-1 inline-flex items-center gap-1 cursor-pointer"
              >
                ← Back to Overview
              </button>
              <h3 className="text-2xl font-black text-slate-900">
                Prices & Daily Delivery Limit
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Set individual capacity for specific dates, default capacity for other dates, and cover prices.
              </p>
            </div>

            {/* Set Specific Date Limit */}
            <form
              onSubmit={handleAddDateLimit}
              className="rounded-2xl border-2 border-indigo-100 bg-indigo-50/40 p-5"
            >
              <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                + Set Custom Order Limit For A Specific Date
              </h4>
              <p className="text-xs text-indigo-800 mt-0.5">
                Override capacity for peak days, festivals, or holidays.
              </p>

              <div className="mt-3 flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={newOverrideDate}
                    onChange={(e) => setNewOverrideDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Max Orders For This Date
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newOverrideLimit}
                    onChange={(e) => setNewOverrideLimit(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="w-full sm:w-auto rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer"
                  >
                    Save Date Limit
                  </button>
                </div>
              </div>
            </form>

            {/* Active Dates Status List */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3">
                Scheduled Dates & Capacity ({datesSummary.length})
              </h4>

              {datesSummary.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  No scheduled dates or overrides configured yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {datesSummary.map(({ dateStr, count, limit, hasCustom }) => {
                    const isFull = count >= limit;
                    return (
                      <div
                        key={dateStr}
                        className={`rounded-2xl border p-4 bg-white shadow-xs ${
                          isFull
                            ? "border-red-300 ring-2 ring-red-100"
                            : hasCustom
                            ? "border-indigo-300 bg-indigo-50/20"
                            : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-black text-slate-900">
                            📅 {dateStr}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                              isFull
                                ? "bg-red-100 text-red-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {isFull ? "Full" : "Open"}
                          </span>
                        </div>

                        <div className="mt-2.5 flex items-baseline justify-between text-xs">
                          <span className="text-slate-500">Booked:</span>
                          <span className="font-mono font-bold text-slate-900">
                            {count} / {limit} orders
                          </span>
                        </div>

                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full ${isFull ? "bg-red-500" : "bg-indigo-600"}`}
                            style={{
                              width: `${Math.min(100, (count / limit) * 100)}%`,
                            }}
                          />
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                          <span className="text-slate-500">
                            {hasCustom ? "⭐ Custom Date Limit" : "Default Limit"}
                          </span>
                          {hasCustom && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDateLimit(dateStr)}
                              className="text-red-600 font-bold hover:underline cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Base Prices & Default Limit */}
            <form onSubmit={handleSaveSettings} className="border-t border-slate-100 pt-6 space-y-6">
              <h4 className="text-sm font-bold text-slate-900">
                General Default Limit & Cover Prices
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Default Limit (Other Dates)
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Applied when date has no custom limit
                  </p>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={settings.defaultDailyLimit || 10}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        defaultDailyLimit: Math.max(1, Number(e.target.value)),
                      })
                    }
                    className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-2.5 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    required
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <label className="block text-xs font-bold uppercase text-slate-600">
                    Normal Cover (₹)
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">Standard grade</p>
                  <input
                    type="number"
                    min={1}
                    value={settings.prices.Normal}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        prices: { ...settings.prices, Normal: Number(e.target.value) },
                      })
                    }
                    className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    required
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <label className="block text-xs font-bold uppercase text-slate-600">
                    Premium Cover (₹)
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Waterproof protective
                  </p>
                  <input
                    type="number"
                    min={1}
                    value={settings.prices.Premium}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        prices: { ...settings.prices, Premium: Number(e.target.value) },
                      })
                    }
                    className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    required
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <label className="block text-xs font-bold uppercase text-slate-600">
                    Special Cover (₹)
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">Custom laminated</p>
                  <input
                    type="number"
                    min={1}
                    value={settings.prices.Special}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        prices: { ...settings.prices, Special: Number(e.target.value) },
                      })
                    }
                    className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase text-slate-600">
                    Delivery Rate:
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={settings.prices.ratePerKm}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        prices: { ...settings.prices, ratePerKm: Number(e.target.value) },
                      })
                    }
                    className="w-20 rounded-lg border border-slate-300 bg-white p-1.5 text-xs font-bold text-slate-900"
                    required
                  />
                  <span className="text-xs text-slate-500">₹/km</span>
                </div>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {savingSettings ? "Updating..." : "Save Default Limit & Prices"}
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}