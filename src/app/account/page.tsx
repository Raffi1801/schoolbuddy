"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Order {
  id: number | string;
  order_number?: string;
  customer_phone: string;
  total_amount: number;
  status: string;
  created_at: string;
  items?: string | any[];
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; phone: string } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Retrieve current logged-in user session
    const savedUser = localStorage.getItem("sb_auth_user");
    if (!savedUser) {
      router.push("/login");
      return;
    }

    const parsedUser = JSON.parse(savedUser);
    setUser(parsedUser);

    // 2. Fetch all persistent orders matching this phone number
    const fetchUserOrders = async () => {
      try {
        const cleaned = parsedUser.phone.replace(/\D/g, "").slice(-10);
        const res = await fetch(`/api/orders?phone=${cleaned}`);
        const data = await res.json();

        if (res.ok && data.orders) {
          setOrders(data.orders);
        }
      } catch (err) {
        console.error("Failed to load user orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserOrders();
  }, [router]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-900">{user?.name}</h1>
          <p className="text-sm text-slate-500 font-mono">+91 {user?.phone}</p>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem("sb_auth_user");
            router.push("/login");
          }}
          className="text-xs font-bold text-rose-600 hover:underline"
        >
          Sign Out
        </button>
      </div>

      <h2 className="text-lg font-bold text-slate-900 mb-4">Your Order History</h2>

      {loading ? (
        <p className="text-sm text-slate-500">Loading your past orders...</p>
      ) : orders.length === 0 ? (
        <div className="bg-slate-50 border border-dashed rounded-xl p-8 text-center text-slate-500 text-sm">
          No orders found for this account yet.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="p-4 border rounded-xl bg-white shadow-sm flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-900">
                  Order #{order.order_number || order.id}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-indigo-600">₹{order.total_amount}</p>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {order.status || "Pending"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}