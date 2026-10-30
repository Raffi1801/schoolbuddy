import { NextRequest, NextResponse } from "next/server";
import { database } from "@/database";

export const dynamic = "force-dynamic";

function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return "";
  const digits = rawPhone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

// Map database row into frontend-compatible shape
function formatOrder(row: any) {
  if (!row) return null;
  let parsedBooks = [];
  try {
    parsedBooks = typeof row.books === "string" ? JSON.parse(row.books) : row.books || [];
  } catch {
    parsedBooks = row.books;
  }

  return {
    id: row.id,
    order_number: row.order_number,
    school: row.school,
    class_name: row.class_name,
    books: parsedBooks,
    cover: row.cover,
    delivery: row.delivery,
    required_date: row.required_date,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    address: row.address,
    total: Number(row.total) || 0,
    payment_due: Number(row.payment_due) || 0,
    payment_type: row.payment_type,
    status: row.status,
    created_at: row.created_at,
  };
}

export async function GET(req: NextRequest) {
  try {
    const orderNumber = req.nextUrl.searchParams.get("orderNumber");
    const phone = req.nextUrl.searchParams.get("phone");

    // 1. Fetch by specific order number
    if (orderNumber) {
      const rows = await database`
        SELECT * FROM orders 
        WHERE order_number = ${orderNumber}
        LIMIT 1
      `;
      const order = rows[0];

      if (order) {
        return NextResponse.json({ order: formatOrder(order) }, { status: 200 });
      }
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Fetch orders matching a customer's logged-in mobile number
    if (phone) {
      const cleaned = normalizePhone(phone);
      const rows = await database`
        SELECT * FROM orders 
        WHERE customer_phone = ${cleaned} OR customer_phone LIKE ${'%' + cleaned}
        ORDER BY id DESC
      `;
      return NextResponse.json(
        { orders: rows.map(formatOrder) },
        { status: 200 }
      );
    }

    // 3. Return all orders (counter / admin view)
    const rows = await database`SELECT * FROM orders ORDER BY id DESC`;
    return NextResponse.json(
      { orders: rows.map(formatOrder) },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, orders: syncedOrders } = body;

    // Bulk sync from localStorage if needed
    if (action === "sync" && Array.isArray(syncedOrders)) {
      for (const o of syncedOrders) {
        const orderNumber = o.order_number;
        const school = o.school || "Loyola";
        const className = o.class_name || "General Class";
        const books = typeof o.books === "string" ? o.books : JSON.stringify(o.books || []);
        const cover = o.cover || "Normal";
        const delivery = o.delivery || "Shop drop-off";
        const requiredDate = o.required_date || "";
        const customerName = (o.customer_name || "").trim();
        const customerPhone = normalizePhone(o.customer_phone || o.phone || "");
        const address = o.address || "Drop at shop";
        const total = Number(o.total) || 0;
        const paymentDue = Number(o.payment_due) || 0;
        const paymentType = o.payment_type || "Pay advance";
        const status = o.status || "Order Placed";
        const createdAt = o.created_at || new Date().toISOString();

        await database`
          INSERT INTO orders (
            order_number, school, class_name, books, cover,
            delivery, required_date, customer_name, customer_phone,
            address, total, payment_due, payment_type, status, created_at
          ) VALUES (
            ${orderNumber}, ${school}, ${className}, ${books}, ${cover},
            ${delivery}, ${requiredDate}, ${customerName}, ${customerPhone},
            ${address}, ${total}, ${paymentDue}, ${paymentType}, ${status}, ${createdAt}
          )
          ON CONFLICT (order_number) DO NOTHING
        `;
      }

      const countResult = await database`SELECT COUNT(*)::int AS count FROM orders`;
      return NextResponse.json({ success: true, count: countResult[0]?.count ?? 0 }, { status: 200 });
    }

    const {
      school,
      className,
      selectedBooks,
      cover,
      delivery,
      requiredDate,
      customerName,
      customerPhone,
      address,
      total,
      paymentDue,
      paymentType,
    } = body;

    const cleanedPhone = normalizePhone(customerPhone);

    if (!customerName || !cleanedPhone || !selectedBooks || selectedBooks.length === 0) {
      return NextResponse.json(
        { error: "Please fill out all required order details." },
        { status: 400 }
      );
    }

    // Format current date and month (DDMM) using Indian Standard Time
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
    });
    const parts = formatter.formatToParts(now);
    const day = parts.find((p) => p.type === "day")?.value || "01";
    const month = parts.find((p) => p.type === "month")?.value || "01";
    const datePrefix = `${day}${month}`; // e.g. "3010" for 30th October

    // Count today's orders with this date prefix to determine sequence
    const countToday = await database`
      SELECT COUNT(*)::int AS count 
      FROM orders 
      WHERE order_number LIKE ${`SB${datePrefix}%`}
    `;
    const sequenceNumber = (countToday[0]?.count ?? 0) + 1;

    // Generates: SB3010001, SB3010002, etc. (no hyphens)
    const orderNumber = `SB${datePrefix}${String(sequenceNumber).padStart(3, "0")}`;

    const booksString = typeof selectedBooks === "string" ? selectedBooks : JSON.stringify(selectedBooks);
    const createdAt = new Date().toISOString();
    const finalSchool = school || "Loyola";
    const finalClassName = className || "General Class";
    const finalCover = cover || "Normal";
    const finalDelivery = delivery || "Shop drop-off";
    const finalRequiredDate = requiredDate || "";
    const finalCustomerName = customerName.trim();
    const finalAddress = address || "Drop at shop";
    const finalTotal = Number(total) || 0;
    const finalPaymentDue = Number(paymentDue) || 0;
    const finalPaymentType = paymentType || "Pay advance";
    const finalStatus = "Order Placed";

    const rows = await database`
      INSERT INTO orders (
        order_number, school, class_name, books, cover,
        delivery, required_date, customer_name, customer_phone,
        address, total, payment_due, payment_type, status, created_at
      ) VALUES (
        ${orderNumber}, ${finalSchool}, ${finalClassName}, ${booksString}, ${finalCover},
        ${finalDelivery}, ${finalRequiredDate}, ${finalCustomerName}, ${cleanedPhone},
        ${finalAddress}, ${finalTotal}, ${finalPaymentDue}, ${finalPaymentType}, ${finalStatus}, ${createdAt}
      )
      RETURNING *
    `;

    return NextResponse.json(
      {
        success: true,
        orderNumber,
        order: formatOrder(rows[0]),
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { orderNumber, status, action } = body;

    if (!orderNumber) {
      return NextResponse.json(
        { error: "Order number is required" },
        { status: 400 }
      );
    }

    // Action to clear remaining balance and mark as settled
    if (action === "pay_due") {
      const rows = await database`
        UPDATE orders 
        SET payment_due = 0,
            payment_type = 'Full Payment Settled (Paid)',
            status = CASE WHEN status = 'Order Placed' THEN 'In Progress' ELSE status END
        WHERE order_number = ${orderNumber}
        RETURNING *
      `;
      return NextResponse.json({ success: true, order: formatOrder(rows[0]) }, { status: 200 });
    }

    // Status transitions
    if (status) {
      if (status === "Completed") {
        await database`
          UPDATE orders 
          SET status = ${status}, payment_due = 0, payment_type = 'Full Payment Settled (Paid)' 
          WHERE order_number = ${orderNumber}
        `;
      } else if (status === "Cancelled") {
        await database`
          UPDATE orders 
          SET status = ${status}, payment_due = 0, payment_type = 'Order Cancelled - Payment Not Required' 
          WHERE order_number = ${orderNumber}
        `;
      } else {
        await database`
          UPDATE orders 
          SET status = ${status} 
          WHERE order_number = ${orderNumber}
        `;
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ error: "No action or status provided" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update order" },
      { status: 500 }
    );
  }
}