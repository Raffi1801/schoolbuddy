import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface SettingsData {
  prices: {
    Normal: number;
    Premium: number;
    Special: number;
    ratePerKm: number;
  };
  defaultDailyLimit: number;
  dateLimits: Record<string, number>; // e.g. { "2026-09-27": 5, "2026-09-28": 15 }
  inventory: Record<string, { stock: number; inStock: boolean }>;
}

let currentSettings: SettingsData = {
  prices: {
    Normal: 25,
    Premium: 40,
    Special: 60,
    ratePerKm: 18,
  },
  defaultDailyLimit: 10,
  dateLimits: {},
  inventory: {},
};

export async function GET() {
  return NextResponse.json({ settings: currentSettings });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { prices, defaultDailyLimit, dateLimits, inventory } = body;

    if (prices) {
      currentSettings.prices = {
        ...currentSettings.prices,
        ...prices,
      };
    }

    if (typeof defaultDailyLimit === "number" && defaultDailyLimit > 0) {
      currentSettings.defaultDailyLimit = defaultDailyLimit;
    }

    if (dateLimits && typeof dateLimits === "object") {
      currentSettings.dateLimits = {
        ...currentSettings.dateLimits,
        ...dateLimits,
      };
    }

    if (inventory) {
      currentSettings.inventory = {
        ...currentSettings.inventory,
        ...inventory,
      };
    }

    return NextResponse.json({ success: true, settings: currentSettings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update settings" }, { status: 500 });
  }
}