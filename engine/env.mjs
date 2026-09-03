import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// القائمة المحتملة لمسارات ملفات البيئة
const candidateFiles = [
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, ".env.local"),
  path.resolve(__dirname, ".env"),
  path.resolve(__dirname, "..", ".env.local"),
  path.resolve(__dirname, "..", ".env"),
];

function parseAndLoad(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eqIdx = line.indexOf("=");
      if (eqIdx <= 0) continue;
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined || process.env[key] === "") {
        process.env[key] = val;
      }
    }
  } catch {
    // تجاهل أخطاء القراءة
  }
}

// 1. محاولة استخدام Node.js loadEnvFile المدمجة
for (const file of candidateFiles) {
  try {
    if (fs.existsSync(file)) {
      if (typeof process.loadEnvFile === "function") {
        try {
          process.loadEnvFile(file);
        } catch {
          parseAndLoad(file);
        }
      } else {
        parseAndLoad(file);
      }
    }
  } catch {}
}

// 2. فحص يدوي احتياطي للتأكد من قراءة كافة المتغيرات
for (const file of candidateFiles) {
  parseAndLoad(file);
}

// 3. توحيد ودعم جميع مسميات المتغيرات
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_KEY ||
  "";

// تعميم القيم في process.env لضمان توافق المكتبات الخارجية
if (SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
  process.env.SUPABASE_URL = SUPABASE_URL;
}
if (SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = SUPABASE_SERVICE_ROLE_KEY;
}
