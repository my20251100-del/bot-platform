import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv"; // 'csv' or 'vcf'

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const admin = createAdmin();

    // التأكد من ملكية البوت
    const { data: bot } = await admin
      .from("bots")
      .select("id, name")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!bot) {
      return NextResponse.json({ error: "البوت غير موجود" }, { status: 404 });
    }

    // جلب سجلات جهات الاتصال المحفوظة
    const { data: logs } = await admin
      .from("bot_logs")
      .select("payload, created_at")
      .eq("bot_id", id)
      .eq("event", "contact_seen")
      .order("created_at", { ascending: false })
      .limit(2000);

    const contactsMap = new Map<string, string>();

    for (const log of logs || []) {
      const jid = log.payload?.jid || "";
      if (jid && !jid.endsWith("@g.us") && !jid.includes("broadcast")) {
        const phone = jid.split("@")[0].replace(/\D/g, "");
        if (phone.length >= 8 && !contactsMap.has(phone)) {
          contactsMap.set(phone, log.created_at);
        }
      }
    }

    const phones = Array.from(contactsMap.keys());

    if (format === "vcf") {
      // تصدير كملف vCard لجهات اتصال الهاتف
      let vcf = "";
      phones.forEach((phone, idx) => {
        vcf += `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:عميل ${bot.name} ${idx + 1}\r\nTEL;TYPE=CELL:+${phone}\r\nEND:VCARD\r\n`;
      });

      return new NextResponse(vcf, {
        headers: {
          "Content-Type": "text/vcard; charset=utf-8",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(bot.name)}-contacts.vcf"`,
        },
      });
    }

    // افتراضي: تصدير CSV
    let csv = "Phone,First_Seen\n";
    contactsMap.forEach((seenAt, phone) => {
      csv += `"+${phone}","${seenAt}"\n`;
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(bot.name)}-contacts.csv"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
