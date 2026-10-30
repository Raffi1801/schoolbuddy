"use client";

import { useMemo, useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const fallbackBooks = [
  "Telugu Books",
  "Hindi Books",
  "English Books",
  "Mathematics Books",
  "Science Books",
  "SocialStudies Books",
  "Biology Books",
  "Other Books",
  "NoteBooks (CW, HW, and others)",
];

const SHOP_LATITUDE = 17.3556;
const SHOP_LONGITUDE = 82.5487;
const MAX_DELIVERY_DISTANCE_METERS = 15000;

function calculateDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function getMinAllowedDate(): string {
  const target = new Date();
  target.setDate(target.getDate() + 3);
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, "0");
  const day = String(target.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type BookItemState = {
  count: number;
  cover: "Normal" | "Premium" | "Special";
};

function BooksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const school = searchParams.get("school") ?? "Selected School";
  const className = searchParams.get("class") ?? "General Standard";

  const minAllowedDate = useMemo(() => getMinAllowedDate(), []);
  const isSubmittingRef = useRef(false);

  // Dynamic state
  const [subjectsList, setSubjectsList] = useState<string[]>(fallbackBooks);
  const [coverPrices, setCoverPrices] = useState<Record<string, number>>({
    Normal: 25,
    Premium: 40,
    Special: 60,
  });
  const [ratePerKm, setRatePerKm] = useState<number>(18);
  const [defaultDailyLimit, setDefaultDailyLimit] = useState<number>(10);
  const [dateLimits, setDateLimits] = useState<Record<string, number>>({});
  const [existingOrders, setExistingOrders] = useState<any[]>([]);

  const [bookItems, setBookItems] = useState<Record<string, BookItemState>>({});
  const [delivery, setDelivery] = useState<"Shop drop-off" | "Home pickup and return">("Shop drop-off");
  const [distanceMeters, setDistanceMeters] = useState<number>(0);
  const [locating, setLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");

  const [payment, setPayment] = useState<"Pay advance" | "Pay full amount">("Pay advance");
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "Cash">("UPI");
  const [requiredDate, setRequiredDate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [orderConfirmedNumber, setOrderConfirmedNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // 1. Fetch School-Specific Subjects
  useEffect(() => {
    async function loadSchoolSubjects() {
      try {
        const res = await fetch("/api/schools");
        const data = await res.json();
        const found = (data.schools || []).find(
          (s: any) => s.name?.toLowerCase() === school.toLowerCase()
        );

        let list = fallbackBooks;
        if (found && Array.isArray(found.subjects) && found.subjects.length > 0) {
          list = found.subjects;
        } else {
          const cached = localStorage.getItem("sb_custom_schools");
          if (cached) {
            const parsed = JSON.parse(cached);
            const foundLocal = parsed.find((s: any) => s.name?.toLowerCase() === school.toLowerCase());
            if (foundLocal?.subjects?.length > 0) list = foundLocal.subjects;
          }
        }

        setSubjectsList(list);
        const init: Record<string, BookItemState> = {};
        list.forEach((b: string) => {
          init[b] = { count: 0, cover: "Normal" };
        });
        setBookItems(init);
      } catch {
        const init: Record<string, BookItemState> = {};
        fallbackBooks.forEach((b) => {
          init[b] = { count: 0, cover: "Normal" };
        });
        setBookItems(init);
      }
    }
    loadSchoolSubjects();
  }, [school]);

  // 2. Fetch Pricing & Per-Date Orders Limit
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sb_shop_settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.prices) {
          setCoverPrices({
            Normal: Number(parsed.prices.Normal) || 25,
            Premium: Number(parsed.prices.Premium) || 40,
            Special: Number(parsed.prices.Special) || 60,
          });
          if (parsed.prices.ratePerKm) setRatePerKm(Number(parsed.prices.ratePerKm));
        }
        if (parsed.defaultDailyLimit) setDefaultDailyLimit(Number(parsed.defaultDailyLimit));
        else if (parsed.maxOrdersPerDay) setDefaultDailyLimit(Number(parsed.maxOrdersPerDay));

        if (parsed.dateLimits && typeof parsed.dateLimits === "object") {
          setDateLimits(parsed.dateLimits);
        }
      }
    } catch {}

    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.settings) {
          if (data.settings.prices) {
            setCoverPrices({
              Normal: Number(data.settings.prices.Normal) || 25,
              Premium: Number(data.settings.prices.Premium) || 40,
              Special: Number(data.settings.prices.Special) || 60,
            });
            if (data.settings.prices.ratePerKm) setRatePerKm(Number(data.settings.prices.ratePerKm));
          }
          if (data.settings.defaultDailyLimit) {
            setDefaultDailyLimit(Number(data.settings.defaultDailyLimit));
          } else if (data.settings.maxOrdersPerDay) {
            setDefaultDailyLimit(Number(data.settings.maxOrdersPerDay));
          }

          if (data.settings.dateLimits && typeof data.settings.dateLimits === "object") {
            setDateLimits(data.settings.dateLimits);
          }
        }
      })
      .catch(() => {});

    fetch("/api/orders")
      .then((r) => r.json())
      .then((data) => {
        const list = data.orders || [];
        setExistingOrders(list);
      })
      .catch(() => {
        try {
          const stored = localStorage.getItem("sb_all_orders_backup");
          if (stored) setExistingOrders(JSON.parse(stored));
        } catch {}
      });
  }, []);

  // Pre-fill user data if logged in
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("sb_current_user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.name && !customerName) setCustomerName(parsed.name);
        if (parsed.phone && !customerPhone) setCustomerPhone(parsed.phone.replace(/\D/g, ""));
      }
    } catch {}
  }, []);

  const isDistanceOutOfRange = distanceMeters > MAX_DELIVERY_DISTANCE_METERS;

  const totalBooksCount = useMemo(() => {
    return Object.values(bookItems).reduce((sum, item) => sum + item.count, 0);
  }, [bookItems]);

  const bookTotal = useMemo(() => {
    return Object.values(bookItems).reduce((sum, item) => {
      if (item.count <= 0) return sum;
      const pricePerBook = coverPrices[item.cover] ?? 25;
      return sum + item.count * pricePerBook;
    }, 0);
  }, [bookItems, coverPrices]);

  const deliveryCharge = useMemo(() => {
    if (delivery !== "Home pickup and return") return 0;
    if (distanceMeters === 0 || isDistanceOutOfRange) return 0;
    const ratePerMeter = ratePerKm / 1000;
    return Math.round(distanceMeters * ratePerMeter);
  }, [delivery, distanceMeters, isDistanceOutOfRange, ratePerKm]);

  const total = bookTotal + deliveryCharge;

  const paymentDue = useMemo(() => {
    return payment === "Pay advance" ? Math.ceil(total * 0.3) : total;
  }, [payment, total]);

  function getOrdersCountForDate(targetDate: string): number {
    return existingOrders.filter(
      (o) => o.required_date === targetDate && o.status !== "Cancelled"
    ).length;
  }

  function getLimitForDate(targetDate: string): number {
    if (dateLimits && targetDate in dateLimits) {
      return Number(dateLimits[targetDate]);
    }
    return defaultDailyLimit || 10;
  }

  function handleDateChange(chosenDate: string) {
    setErrorMessage("");

    if (chosenDate < minAllowedDate) {
      triggerError("Please select a completion date at least 3 days from today.");
      setRequiredDate("");
      return;
    }

    const currentBookings = getOrdersCountForDate(chosenDate);
    const limitForDate = getLimitForDate(chosenDate);

    if (currentBookings >= limitForDate) {
      triggerError(
        `Delivery slots are fully booked for ${chosenDate}. Please choose another date.`
      );
      setRequiredDate("");
      return;
    }

    setRequiredDate(chosenDate);
  }

  function triggerError(msg: string) {
    setErrorMessage(msg);
    isSubmittingRef.current = false;
    setSubmitting(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function incrementBook(book: string) {
    setBookItems((prev) => {
      const current = prev[book] || { count: 0, cover: "Normal" };
      return {
        ...prev,
        [book]: { ...current, count: (current.count || 0) + 1 },
      };
    });
  }

  function decrementBook(book: string) {
    setBookItems((prev) => {
      const current = prev[book] || { count: 0, cover: "Normal" };
      return {
        ...prev,
        [book]: { ...current, count: Math.max(0, (current.count || 0) - 1) },
      };
    });
  }

  function toggleBookCheckbox(book: string) {
    setBookItems((prev) => {
      const current = prev[book] || { count: 0, cover: "Normal" };
      return {
        ...prev,
        [book]: { ...current, count: (current.count || 0) > 0 ? 0 : 1 },
      };
    });
  }

  function handleCoverChange(book: string, coverType: "Normal" | "Premium" | "Special") {
    setBookItems((prev) => {
      const current = prev[book] || { count: 0, cover: "Normal" };
      return {
        ...prev,
        [book]: { ...current, cover: coverType },
      };
    });
  }

  function handleGetCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    setLocationStatus("Detecting your location via GPS...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const meters = calculateDistanceInMeters(
          SHOP_LATITUDE,
          SHOP_LONGITUDE,
          latitude,
          longitude
        );
        setDistanceMeters(meters);

        const readableDistance =
          meters >= 1000
            ? `${(meters / 1000).toFixed(2)} km`
            : `${meters} meters`;

        if (meters > MAX_DELIVERY_DISTANCE_METERS) {
          setLocationStatus(
            `Location detected: ${readableDistance}. Pickup & return is only available within 15 km of our Tuni shop.`
          );
        } else {
          const calculatedFee = Math.round(meters * (ratePerKm / 1000));
          setLocationStatus(
            `Location detected: ${readableDistance} from shop. Delivery charge: ₹${calculatedFee}`
          );
        }
        setLocating(false);
      },
      () => {
        setLocationStatus("Location access denied. Please enable GPS permissions in your browser.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();

    if (isSubmittingRef.current || submitting || orderConfirmedNumber) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    setErrorMessage("");

    if (totalBooksCount === 0) {
      triggerError("Please select at least 1 book.");
      return;
    }

    if (!requiredDate || requiredDate < minAllowedDate) {
      triggerError("Please select a completion date at least 3 days from today.");
      return;
    }

    const bookingsForTarget = getOrdersCountForDate(requiredDate);
    const limitForDate = getLimitForDate(requiredDate);
    if (bookingsForTarget >= limitForDate) {
      triggerError(
        `Delivery capacity full (${bookingsForTarget}/${limitForDate}) for ${requiredDate}. Please pick another date.`
      );
      return;
    }

    if (!customerName.trim()) {
      triggerError("Please enter parent or student name.");
      return;
    }

    const cleanPhone = customerPhone.replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      triggerError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (delivery === "Home pickup and return") {
      if (distanceMeters === 0) {
        triggerError("Please click 'Use Current GPS Location' to determine pickup eligibility.");
        return;
      }
      if (isDistanceOutOfRange) {
        triggerError("Delivery is not available beyond 15 km. Please select 'Shop drop-off'.");
        return;
      }
      if (!address.trim()) {
        triggerError("Please provide your doorstep address.");
        return;
      }
    }

    const booksPayload = Object.entries(bookItems)
      .filter(([_, item]) => item.count > 0)
      .map(([name, item]) => ({
        name,
        count: item.count,
        cover: item.cover,
        pricePerBook: coverPrices[item.cover] ?? 25,
      }));

    const coverSummary = Array.from(new Set(booksPayload.map((b) => b.cover))).join(", ");

    try {
      const distanceLabel =
        distanceMeters >= 1000
          ? `${(distanceMeters / 1000).toFixed(2)} km`
          : `${distanceMeters} m`;

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school,
          className,
          selectedBooks: booksPayload,
          cover: coverSummary,
          delivery,
          requiredDate,
          customerName: customerName.trim(),
          customerPhone: cleanPhone,
          address:
            delivery === "Home pickup and return"
              ? `${address} (Distance: ${distanceLabel} · Fee: ₹${deliveryCharge})`
              : "Drop at shop",
          total,
          paymentDue,
          paymentType: `${payment} via ${paymentMethod}`,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Server responded with status ${res.status}`);
      }

      try {
        const existing = JSON.parse(localStorage.getItem("sb_recent_orders") || "[]");
        localStorage.setItem("sb_recent_orders", JSON.stringify([data.orderNumber, ...existing]));
      } catch {}

      if (data.order) {
        try {
          const allBackup = JSON.parse(localStorage.getItem("sb_all_orders_backup") || "[]");
          const filtered = allBackup.filter((o: any) => o.order_number !== data.order.order_number);
          localStorage.setItem("sb_all_orders_backup", JSON.stringify([data.order, ...filtered]));
        } catch {}
      }

      setOrderConfirmedNumber(data.orderNumber);

      setTimeout(() => {
        router.replace(`/tracking?orderNumber=${data.orderNumber}`);
      }, 1200);
    } catch (err: any) {
      console.error("Order submission failed:", err);
      triggerError(err.message || "An unexpected error occurred while placing your order.");
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (orderConfirmedNumber) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center text-slate-900">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">
            ✓
          </div>
          <h2 className="mt-5 text-2xl font-black text-slate-900">Order Placed!</h2>
          <p className="mt-1 font-mono text-sm font-bold text-indigo-600">
            #{orderConfirmedNumber}
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Your book covering order has been successfully registered. Taking you to the tracking page...
          </p>
          <div className="mt-6 flex justify-center">
            <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-full animate-pulse bg-indigo-600" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">📚</span>
            School<span className="text-indigo-600">Buddy</span>
          </a>
          <a
            href="/schools"
            className="text-sm font-semibold text-slate-600 hover:text-indigo-700"
          >
            ← Change School
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-10">
        <p className="font-semibold text-xs tracking-wider uppercase text-indigo-700">Step 3 of 3</p>
        <h1 className="mt-1 text-3xl font-extrabold text-slate-900">Configure Books & Covers</h1>
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-bold text-slate-900">{school}</span> · {className}
        </p>

        {errorMessage && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 shadow-sm">
            ⚠️ {errorMessage}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          <form onSubmit={handlePlaceOrder} autoComplete="off" className="space-y-8">
            {/* 1. Books List with Custom Syllabus Subjects */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Select Books & Protective Covers</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Curriculum subjects for {school}.
                  </p>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">
                  {totalBooksCount} Selected
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {subjectsList.map((book) => {
                  const item = bookItems[book] || { count: 0, cover: "Normal" };
                  const isSelected = item.count > 0;
                  const currentPrice = coverPrices[item.cover] ?? 25;

                  return (
                    <div
                      key={book}
                      className={`rounded-xl border p-4 transition-all ${
                        isSelected
                          ? "border-emerald-300 bg-emerald-50/40 shadow-xs"
                          : "border-slate-200 bg-slate-50/50 opacity-80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <label className="flex flex-1 cursor-pointer items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleBookCheckbox(book)}
                            className="h-5 w-5 accent-indigo-700 cursor-pointer rounded"
                          />
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{book}</p>
                            <span className="text-xs text-slate-500">
                              {isSelected
                                ? `₹${currentPrice} each · Subtotal: ₹${item.count * currentPrice}`
                                : "Standard syllabus book"}
                            </span>
                          </div>
                        </label>

                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-xs">
                          <button
                            type="button"
                            onClick={() => decrementBook(book)}
                            disabled={item.count === 0}
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-30 transition"
                          >
                            −
                          </button>
                          <span className="w-5 text-center font-mono font-bold text-slate-800 text-sm">
                            {item.count}
                          </span>
                          <button
                            type="button"
                            onClick={() => incrementBook(book)}
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 transition"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-emerald-200/60 pt-3">
                          <span className="text-xs font-semibold text-slate-600">Cover Grade:</span>
                          {(["Normal", "Premium", "Special"] as const).map((cType) => (
                            <button
                              key={cType}
                              type="button"
                              onClick={() => handleCoverChange(book, cType)}
                              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                item.cover === cType
                                  ? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300"
                                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              {cType} (₹{coverPrices[cType] ?? 25})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 2. Service & Delivery */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">
                2. Service & Delivery Mode
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div
                  onClick={() => setDelivery("Shop drop-off")}
                  className={`relative cursor-pointer rounded-xl border p-4 transition-all ${
                    delivery === "Shop drop-off"
                      ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-200"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <label className="flex cursor-pointer items-center gap-3 font-bold text-slate-900 text-sm">
                    <input
                      type="radio"
                      name="delivery"
                      checked={delivery === "Shop drop-off"}
                      onChange={() => setDelivery("Shop drop-off")}
                      className="h-4 w-4 accent-indigo-700"
                    />
                    Shop Drop-off
                  </label>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    Bring books directly to our shop in Tuni. Zero delivery fee (₹0).
                  </p>

                  <div className="mt-4 border-t border-slate-200/80 pt-3">
                    <a
                      href="https://maps.app.goo.gl/MbXRJtreDRJwaM9T7"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-xs hover:bg-indigo-50 transition"
                    >
                      <span>📍</span> View Shop Location on Maps ↗
                    </a>
                  </div>
                </div>

                <div
                  onClick={() => setDelivery("Home pickup and return")}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    delivery === "Home pickup and return"
                      ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-200"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <label className="flex cursor-pointer items-center gap-3 font-bold text-slate-900 text-sm">
                    <input
                      type="radio"
                      name="delivery"
                      checked={delivery === "Home pickup and return"}
                      onChange={() => setDelivery("Home pickup and return")}
                      className="h-4 w-4 accent-indigo-700"
                    />
                    Home Pickup & Return
                  </label>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    Doorstep pickup & return within 15 km of our shop (₹{ratePerKm} per km).
                  </p>

                  {delivery === "Home pickup and return" && distanceMeters > 0 && !isDistanceOutOfRange && (
                    <span className="mt-3 inline-block rounded-md bg-indigo-100 px-2 py-1 text-xs font-bold text-indigo-800">
                      Distance: {distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(2)} km` : `${distanceMeters} m`}
                    </span>
                  )}
                  {delivery === "Home pickup and return" && isDistanceOutOfRange && (
                    <span className="mt-3 inline-block rounded-md bg-red-100 px-2 py-1 text-xs font-bold text-red-800">
                      Distance exceeds 15 km limit
                    </span>
                  )}
                </div>
              </div>

              {delivery === "Home pickup and return" && (
                <div className="mt-5 space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div>
                    <button
                      type="button"
                      onClick={handleGetCurrentLocation}
                      disabled={locating}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:bg-slate-400 transition"
                    >
                      {locating ? "Detecting GPS..." : "📍 Use Current GPS Location"}
                    </button>

                    {locationStatus && (
                      <p
                        className={`mt-2 text-xs font-semibold ${
                          isDistanceOutOfRange ? "text-red-600" : "text-slate-600"
                        }`}
                      >
                        {locationStatus}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Doorstep Pickup Address
                    </label>
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      disabled={isDistanceOutOfRange}
                      placeholder={
                        isDistanceOutOfRange
                          ? "Address locked: Location exceeds 15 km limit"
                          : "Flat/door no, street, landmark, area in Tuni"
                      }
                      className={`mt-1 w-full rounded-xl border p-3 text-sm transition focus:outline-none ${
                        isDistanceOutOfRange
                          ? "cursor-not-allowed border-red-200 bg-red-50/50 text-slate-400 placeholder:text-red-400"
                          : "border-slate-300 bg-white focus:border-indigo-600"
                      }`}
                      required={!isDistanceOutOfRange}
                    />
                  </div>
                </div>
              )}
            </section>

            {/* 3. Schedule & Contact */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">
                3. Schedule & Contact
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Required-by Date <span className="text-slate-400 lowercase font-normal">(min. 3 days)</span>
                  </label>
                  <input
                    type="date"
                    min={minAllowedDate}
                    value={requiredDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm focus:border-indigo-600 focus:outline-none"
                    required
                  />
                  {requiredDate && (
                    <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                      ✓ Date Available
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Parent / Student Name
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Full name"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm focus:border-indigo-600 focus:outline-none"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Contact Phone Number
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex h-[46px] items-center rounded-xl border border-slate-300 bg-slate-100 px-3.5 font-mono text-sm font-bold text-slate-700">
                      +91
                    </div>
                    <input
                      type="text"
                      autoComplete="off"
                      inputMode="numeric"
                      maxLength={10}
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="10-digit mobile number"
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-sm tracking-widest text-slate-900 focus:border-indigo-600 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 4. Payment Preference */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">
                4. Payment Method & Preference
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    payment === "Pay advance"
                      ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-200"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <span className="flex items-center gap-2.5 font-bold text-sm text-slate-900">
                    <input
                      type="radio"
                      name="payment"
                      checked={payment === "Pay advance"}
                      onChange={() => setPayment("Pay advance")}
                      className="accent-indigo-700"
                    />
                    Pay 30% Advance (₹{Math.ceil(total * 0.3)})
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Book slot now. Settle balance upon pickup or delivery.
                  </span>
                </label>

                <label
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    payment === "Pay full amount"
                      ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-200"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <span className="flex items-center gap-2.5 font-bold text-sm text-slate-900">
                    <input
                      type="radio"
                      name="payment"
                      checked={payment === "Pay full amount"}
                      onChange={() => setPayment("Pay full amount")}
                      className="accent-indigo-700"
                    />
                    Pay 100% Full Amount (₹{total})
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Settle complete invoice upfront.
                  </span>
                </label>
              </div>

              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Select Payment Mode
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("UPI")}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 font-bold text-sm transition ${
                      paymentMethod === "UPI"
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 ring-2 ring-indigo-200"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>⚡</span> UPI / QR Scan
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("Cash")}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 font-bold text-sm transition ${
                      paymentMethod === "Cash"
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 ring-2 ring-indigo-200"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>💵</span> Cash on Hand
                  </button>
                </div>
              </div>
            </section>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={
                totalBooksCount === 0 ||
                submitting ||
                !!orderConfirmedNumber ||
                (delivery === "Home pickup and return" && isDistanceOutOfRange)
              }
              className="w-full rounded-xl bg-indigo-600 px-6 py-4 text-base font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 transition"
            >
              {submitting
                ? "Processing Order, Please Wait..."
                : isDistanceOutOfRange && delivery === "Home pickup and return"
                ? "Distance Exceeds 15 km Limit"
                : `Confirm & Place Order (${totalBooksCount} Books) · ₹${paymentDue} Due`}
            </button>
          </form>

          {/* Sticky Order Summary Sidebar */}
          <aside className="h-fit rounded-2xl bg-slate-900 p-6 text-white lg:sticky lg:top-6 shadow-md">
            <h2 className="text-lg font-bold border-b border-slate-800 pb-3">Order Summary</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <p className="font-semibold text-white">
                {totalBooksCount} Total Books Selected
              </p>

              <div className="mt-2 space-y-1 text-xs text-slate-400">
                {Object.entries(bookItems)
                  .filter(([_, item]) => item.count > 0)
                  .map(([name, item]) => {
                    const pricePerBook = coverPrices[item.cover] ?? 25;
                    return (
                      <div key={name} className="flex justify-between py-0.5">
                        <span>
                          {item.count}× {name} ({item.cover})
                        </span>
                        <span className="font-mono text-slate-200">
                          ₹{item.count * pricePerBook}
                        </span>
                      </div>
                    );
                  })}
              </div>

              <div className="border-t border-slate-800 pt-3 text-xs">
                <p className="text-slate-300 font-medium">{delivery}</p>
                {delivery === "Home pickup and return" && distanceMeters > 0 && (
                  <p className="text-indigo-400">
                    {distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(2)} km` : `${distanceMeters} m`} (₹{ratePerKm}/km)
                  </p>
                )}
                {requiredDate && (
                  <p className="mt-1 text-slate-400">
                    Target Date: {requiredDate}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-2 border-t border-slate-800 pt-4 text-sm">
              <div className="flex justify-between text-slate-300">
                <span>Books Subtotal</span>
                <span className="font-mono text-white">₹{bookTotal}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Delivery</span>
                <span className="font-mono text-white">
                  {isDistanceOutOfRange && delivery === "Home pickup and return"
                    ? "Unavailable (>15km)"
                    : `₹${deliveryCharge}`}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-3 text-base font-bold">
                <span>Total Amount</span>
                <span className="font-mono text-emerald-400">₹{total}</span>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-slate-800/90 p-4 border border-slate-700/60">
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Amount Due Now</p>
              <p className="mt-1 text-2xl font-black font-mono text-white">₹{paymentDue}</p>
              <p className="mt-1 text-[11px] text-slate-400">
                {payment === "Pay advance" ? "30% advance" : "100% full payment"} ({paymentMethod})
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default function BooksPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-12 text-center font-medium text-slate-600">
          Loading booking interface...
        </div>
      }
    >
      <BooksContent />
    </Suspense>
  );
}