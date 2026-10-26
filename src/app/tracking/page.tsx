"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface OrderDetail {
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

function TrackingContent() {
  const searchParams = useSearchParams();
  const orderNumberParam = searchParams.get("orderNumber") || "";

  const [allOrders, setAllOrders] = useState<OrderDetail[]>([]);
  const [searchTerm, setSearchTerm] = useState(orderNumberParam);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllOrders() {
      setLoading(true);
      try {
        let localBackup: OrderDetail[] = [];
        try {
          const stored = localStorage.getItem("sb_all_orders_backup");
          if (stored) localBackup = JSON.parse(stored);
        } catch {}

        const res = await fetch("/api/orders");
        const data = await res.json();
        const serverOrders: OrderDetail[] = data.orders || (Array.isArray(data) ? data : []);

        const merged: OrderDetail[] = [...serverOrders];
        localBackup.forEach((loc) => {
          if (!merged.some((m) => m.order_number === loc.order_number)) {
            merged.push(loc);
          }
        });

        // Normalize Cancelled orders so payment is marked not required
        const normalized = merged.map((o) => {
          if (o.status === "Cancelled") {
            return {
              ...o,
              payment_due: 0,
              payment_type: "Order Cancelled - Payment Not Required",
            };
          }
          return o;
        });

        normalized.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setAllOrders(normalized);

        if (orderNumberParam) {
          const found = normalized.find((o) => o.order_number === orderNumberParam);
          if (found) setSelectedOrder(found);
        } else if (normalized.length > 0) {
          setSelectedOrder(normalized[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchAllOrders();
  }, [orderNumberParam]);

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return allOrders;
    return allOrders.filter(
      (o) =>
        o.order_number?.toLowerCase().includes(term) ||
        o.customer_name?.toLowerCase().includes(term) ||
        o.customer_phone?.includes(term) ||
        o.school?.toLowerCase().includes(term)
    );
  }, [allOrders, searchTerm]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">📚</span>
            School<span className="text-indigo-600">Buddy</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/schools"
              className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition"
            >
              + New Order
            </Link>
            <Link href="/" className="text-xs font-semibold text-slate-600 hover:text-indigo-700">
              ← Home
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 pt-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Track Orders & Status</h1>
            <p className="mt-1 text-sm text-slate-600">
              Check progress, covering status, and payment summary.
            </p>
          </div>
          <span className="self-start sm:self-auto rounded-full bg-indigo-100 px-3.5 py-1 text-xs font-bold text-indigo-800">
            Total Orders: {allOrders.length}
          </span>
        </div>

        {/* Search Input */}
        <div className="mt-6">
          <input
            type="text"
            placeholder="Search by Order ID (SB-...), Name, Mobile, or School..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm shadow-xs focus:border-indigo-600 focus:outline-none"
          />
        </div>

        {/* Selected Order Detailed View */}
        {selectedOrder && (
          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="font-mono text-xs font-bold text-indigo-600 uppercase">
                    Active View · Order #{selectedOrder.order_number}
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 mt-0.5">
                    {selectedOrder.school} · {selectedOrder.class_name}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 font-bold text-xs ${
                      selectedOrder.status === "Completed"
                        ? "bg-emerald-100 text-emerald-800"
                        : selectedOrder.status === "Cancelled"
                        ? "bg-slate-200 text-slate-700"
                        : "bg-indigo-100 text-indigo-800"
                    }`}
                  >
                    {selectedOrder.status || "Order Placed"}
                  </span>

                  {/* Payment Badge Logic */}
                  {selectedOrder.status === "Cancelled" ? (
                    <span className="rounded-full bg-slate-200 px-3 py-1 font-bold text-xs text-slate-700">
                      Not Required
                    </span>
                  ) : selectedOrder.payment_due > 0 ? (
                    <span className="rounded-full bg-amber-100 border border-amber-300 px-3 py-1 font-bold text-xs text-amber-900">
                      Due ₹{selectedOrder.payment_due}
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-600 px-3 py-1 font-bold text-xs text-white">
                      ✓ Payment Done
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4 text-xs">
                <div>
                  <p className="text-slate-400 font-bold uppercase">Customer</p>
                  <p className="mt-1 font-bold text-slate-800 text-sm">{selectedOrder.customer_name}</p>
                  <p className="font-mono text-slate-500">{selectedOrder.customer_phone}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase">Delivery Mode</p>
                  <p className="mt-1 font-bold text-slate-800 text-sm">{selectedOrder.delivery}</p>
                  <p className="text-slate-500">{selectedOrder.address || "Drop at shop (Tuni)"}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase">Target Date</p>
                  <p className="mt-1 font-bold text-slate-800 text-sm">{selectedOrder.required_date || "3 Days"}</p>
                  <p className="text-slate-500">Scheduled</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase">Total Bill</p>
                  <p className="mt-1 font-mono text-base font-black text-slate-900">₹{selectedOrder.total}</p>
                  <p className="text-slate-500">{selectedOrder.payment_type}</p>
                </div>
              </div>
            </div>

            {/* PAYMENT DETAILS BANNER */}
            {selectedOrder.status === "Cancelled" ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">Order Cancelled</p>
                  <p className="text-xs text-slate-500">This booking was cancelled. Payment is not required.</p>
                </div>
                <span className="rounded-md bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700">
                  Not Required
                </span>
              </div>
            ) : selectedOrder.payment_due > 0 ? (
              <div className="rounded-2xl border-2 border-amber-400 bg-amber-50/70 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="rounded-md bg-amber-200 px-2.5 py-0.5 text-xs font-black text-amber-900 uppercase">
                      Pending Balance
                    </span>
                    <h3 className="mt-1 text-lg font-black text-slate-900">
                      Complete Due Payment: <span className="font-mono text-indigo-700 font-bold">₹{selectedOrder.payment_due}</span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Please settle this remaining balance during book drop-off/delivery, or via UPI to <strong className="text-slate-800 font-mono">schoolbuddy@ibl</strong>.
                    </p>
                  </div>
                  <div className="shrink-0 rounded-xl bg-amber-100 border border-amber-300 px-4 py-2 text-xs font-bold text-amber-900">
                    To be collected by shop
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                    ✓
                  </span>
                  <div>
                    <p className="text-sm font-bold text-emerald-900">Payment Done</p>
                    <p className="text-xs text-emerald-700">All payments for this order are settled.</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-emerald-900 text-sm">₹0 Balance</span>
              </div>
            )}
          </div>
        )}

        {/* Orders List Cards */}
        <div className="mt-10">
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            Orders List ({filteredOrders.length})
          </h3>

          {loading ? (
            <div className="rounded-2xl bg-white p-12 text-center text-sm text-slate-500">
              Loading orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="text-base font-bold text-slate-700">No orders found</p>
              <p className="text-xs text-slate-500 mt-1">Try a different search query.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredOrders.map((o) => {
                const isSelected = selectedOrder?.order_number === o.order_number;
                return (
                  <div
                    key={o.order_number}
                    onClick={() => {
                      setSelectedOrder(o);
                      window.scrollTo({ top: 120, behavior: "smooth" });
                    }}
                    className={`cursor-pointer rounded-xl border p-4 transition ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-200"
                        : "border-slate-200 bg-white hover:border-slate-300 shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        #{o.order_number}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            o.status === "Completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : o.status === "Cancelled"
                              ? "bg-slate-200 text-slate-700"
                              : "bg-indigo-100 text-indigo-800"
                          }`}
                        >
                          {o.status || "Placed"}
                        </span>

                        {/* List Card Payment Badge */}
                        {o.status === "Cancelled" ? (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                            Not Required
                          </span>
                        ) : o.payment_due > 0 ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                            Due ₹{o.payment_due}
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            Paid
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {o.school} · {o.class_name}
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500">
                      <span>👤 {o.customer_name}</span>
                      <span className="font-mono font-bold text-slate-900">Total: ₹{o.total}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function TrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-12 text-center text-slate-600 font-medium">
          Loading order tracking...
        </div>
      }
    >
      <TrackingContent />
    </Suspense>
  );
}