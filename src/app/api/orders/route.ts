import { NextRequest, NextResponse } from "next/server";
import { database } from "@/database";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await database`
      SELECT * FROM orders 
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ orders: rows || [] });
  } catch (err: any) {
    console.error("GET /api/orders error:", err);
    return NextResponse.json({ error: err.message, orders: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Generate clean order number if not passed
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = body.orderNumber || `SB-${Date.now().toString().slice(-4)}-${randomSuffix}`;

    const customerName = (body.customerName || "").trim();
    const customerPhone = (body.customerPhone || "").trim();
    const school = (body.school || "").trim();
    const className = (body.className || "").trim();
    const delivery = (body.delivery || "Shop drop-off").trim();
    const address = (body.address || "").trim();
    const requiredDate = body.requiredDate || null;
    const total = Number(body.total) || 0;
    const paymentDue = Number(body.paymentDue) || 0;
    const paymentType = (body.paymentType || "").trim();
    const cover = (body.cover || "").trim();
    const status = body.status || "Order Placed";
    
    // JSON format for selected books
    const booksJson = JSON.stringify(body.selectedBooks || body.books || []);

    const result = await database`
      INSERT INTO orders (
        order_number,
        customer_name,
        customer_phone,
        school,
        class_name,
        books,
        cover,
        delivery,
        address,
        required_date,
        total,
        payment_due,
        payment_type,
        status
      ) VALUES (
        ${orderNumber},
        ${customerName},
        ${customerPhone},
        ${school},
        ${className},
        ${booksJson},
        ${cover},
        ${delivery},
        ${address},
        ${requiredDate},
        ${total},
        ${paymentDue},
        ${paymentType},
        ${status}
      )
      RETURNING *;
    `;

    return NextResponse.json({
      success: true,
      orderNumber,
      order: result[0],
    });
  } catch (err: any) {
    console.error("POST /api/orders insertion failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to record order" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderNumber, status, action } = body;

    if (!orderNumber) {
      return NextResponse.json({ error: "Missing orderNumber" }, { status: 400 });
    }

    if (action === "pay_due") {
      const updated = await database`
        UPDATE orders
        SET payment_due = 0, payment_type = 'Full Payment Settled (Paid)'
        WHERE order_number = ${orderNumber}
        RETURNING *;
      `;
      return NextResponse.json({ success: true, order: updated[0] });
    }

    if (status) {
      const updated = await database`
        UPDATE orders
        SET status = ${status}
        WHERE order_number = ${orderNumber}
        RETURNING *;
      `;
      return NextResponse.json({ success: true, order: updated[0] });
    }

    return NextResponse.json({ error: "No action specified" }, { status: 400 });
  } catch (err: any) {
    console.error("PATCH /api/orders failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}