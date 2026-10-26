import { NextRequest, NextResponse } from "next/server";
import db from "@/database";

export const dynamic = "force-dynamic";

function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return "";
  const digits = rawPhone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

// Map SQLite row into frontend-compatible shape
function formatOrder(row: any) {
  if (!row) return null;
  let parsedBooks = [];
  try {
    parsedBooks = JSON.parse(row.books || "[]");
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
      const stmt = db.prepare("SELECT * FROM orders WHERE order_number = ?");
      const order = stmt.get(orderNumber);

      if (order) {
        return NextResponse.json({ order: formatOrder(order) }, { status: 200 });
      }
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Fetch orders matching a customer's logged-in mobile number
    if (phone) {
      const cleaned = normalizePhone(phone);
      const stmt = db.prepare(
        "SELECT * FROM orders WHERE customer_phone = ? OR customer_phone LIKE ? ORDER BY id DESC"
      );
      const orders = stmt.all(cleaned, `%${cleaned}`);
      return NextResponse.json(
        { orders: orders.map(formatOrder) },
        { status: 200 }
      );
    }

    // 3. Return all orders (e.g. for counter / admin view)
    const stmt = db.prepare("SELECT * FROM orders ORDER BY id DESC");
    const allOrders = stmt.all();
    return NextResponse.json(
      { orders: allOrders.map(formatOrder) },
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
      const insertSyncStmt = db.prepare(`
        INSERT OR IGNORE INTO orders (
          order_number, school, class_name, books, cover,
          delivery, required_date, customer_name, customer_phone,
          address, total, payment_due, payment_type, status, created_at
        ) VALUES (
          @order_number, @school, @class_name, @books, @cover,
          @delivery, @required_date, @customer_name, @customer_phone,
          @address, @total, @payment_due, @payment_type, @status, @created_at
        )
      `);

      const syncTransaction = db.transaction((ordersToSync: any[]) => {
        for (const o of ordersToSync) {
          insertSyncStmt.run({
            order_number: o.order_number,
            school: o.school || "Loyola",
            class_name: o.class_name || "General Class",
            books: typeof o.books === "string" ? o.books : JSON.stringify(o.books || []),
            cover: o.cover || "Normal",
            delivery: o.delivery || "Shop drop-off",
            required_date: o.required_date || "",
            customer_name: (o.customer_name || "").trim(),
            customer_phone: normalizePhone(o.customer_phone || o.phone || ""),
            address: o.address || "Drop at shop",
            total: Number(o.total) || 0,
            payment_due: Number(o.payment_due) || 0,
            payment_type: o.payment_type || "Pay advance",
            status: o.status || "Order Placed",
            created_at: o.created_at || new Date().toISOString(),
          });
        }
      });

      syncTransaction(syncedOrders);

      const count = db.prepare("SELECT COUNT(*) AS count FROM orders").get() as { count: number };
      return NextResponse.json({ success: true, count: count.count }, { status: 200 });
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

    const orderNumber = `SB-${Math.floor(100000 + Math.random() * 900000)}`;
    const booksString = typeof selectedBooks === "string" ? selectedBooks : JSON.stringify(selectedBooks);
    const createdAt = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO orders (
        order_number, school, class_name, books, cover,
        delivery, required_date, customer_name, customer_phone,
        address, total, payment_due, payment_type, status, created_at
      ) VALUES (
        @order_number, @school, @class_name, @books, @cover,
        @delivery, @required_date, @customer_name, @customer_phone,
        @address, @total, @payment_due, @payment_type, @status, @created_at
      )
    `);

    const newOrderData = {
      order_number: orderNumber,
      school: school || "Loyola",
      class_name: className || "General Class",
      books: booksString,
      cover: cover || "Normal",
      delivery: delivery || "Shop drop-off",
      required_date: requiredDate || "",
      customer_name: customerName.trim(),
      customer_phone: cleanedPhone,
      address: address || "Drop at shop",
      total: Number(total) || 0,
      payment_due: Number(paymentDue) || 0,
      payment_type: paymentType || "Pay advance",
      status: "Order Placed",
      created_at: createdAt,
    };

    const result = insertStmt.run(newOrderData);

    return NextResponse.json(
      {
        success: true,
        orderNumber,
        order: { id: result.lastInsertRowid, ...newOrderData, books: selectedBooks },
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
      const updateStmt = db.prepare(`
        UPDATE orders 
        SET payment_due = 0,
            payment_type = 'Full Payment Settled (Paid)',
            status = CASE WHEN status = 'Order Placed' THEN 'In Progress' ELSE status END
        WHERE order_number = ?
      `);
      updateStmt.run(orderNumber);

      const updated = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(orderNumber);
      return NextResponse.json({ success: true, order: formatOrder(updated) }, { status: 200 });
    }

    // Status transitions
    if (status) {
      if (status === "Completed") {
        db.prepare(`
          UPDATE orders 
          SET status = ?, payment_due = 0, payment_type = 'Full Payment Settled (Paid)' 
          WHERE order_number = ?
        `).run(status, orderNumber);
      } else if (status === "Cancelled") {
        db.prepare(`
          UPDATE orders 
          SET status = ?, payment_due = 0, payment_type = 'Order Cancelled - Payment Not Required' 
          WHERE order_number = ?
        `).run(status, orderNumber);
      } else {
        db.prepare("UPDATE orders SET status = ? WHERE order_number = ?").run(status, orderNumber);
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