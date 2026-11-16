import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getOrCreatePaperSettings,
  updatePaperSettings,
} from "@/lib/paper-trading/paper-trading-service";

export const dynamic = "force-dynamic";

const settingsPatchSchema = z.object({
  enabled: z.boolean().optional(),
  itmDistance: z.number().min(0).max(1000).optional(),
  numberOfLots: z.number().min(1).max(50).optional(),
  fillMethod: z.enum(["ASK_BID", "LTP"]).optional(),
  exitOnNeutral: z.boolean().optional(),
  estimatedCharges: z.number().min(0).optional(),
  quoteFreshnessLimit: z.number().min(5).max(3600).optional(),
});

export async function GET() {
  try {
    const settings = await getOrCreatePaperSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    console.error("Paper settings GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch settings: " + err.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const validated = settingsPatchSchema.parse(body);

    const currentSettings = await getOrCreatePaperSettings();
    const updated = await updatePaperSettings(currentSettings.strategyId, validated);

    return NextResponse.json({ success: true, settings: updated });
  } catch (err) {
    console.error("Paper settings PATCH error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: err.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update settings: " + err.message },
      { status: 500 }
    );
  }
}
