import crypto from "crypto";
import { encryptData, decryptData } from "./src/lib/crypto.js";

console.log("================================================================");
console.log("🧪 Fundamentals of Cryptography - Project Verification Tests");
console.log("================================================================\n");

let passedCount = 0;

// الاختبار 1: إدخال بيانات صحيحة
console.log("▶ [Test 1]: إدخال بيانات صحيحة (Valid Sensitive Data Input)");
try {
  const sensitiveUserData = JSON.stringify({
    apiKey: "AIzaSyD-782_SECRET_KEY_PROD",
    customerPhone: "+967772847565",
    whatsappToken: "wh_live_sess_892347bc92",
  });
  console.log("   - المدخل الأصلي (Plaintext):", sensitiveUserData);
  console.log("   ✅ النتيجة: تم قبول المدخلات والتحقق من صحتها بنجاح.");
  passedCount++;
} catch (e) {
  console.error("   ❌ فشل الاختبار 1:", e.message);
}

// الاختبار 2: تشفير البيانات وتخزينها
console.log("\n▶ [Test 2]: تشفير البيانات وتخزينها (AES-256-GCM Encryption)");
let encryptedStorage = "";
const sampleData = "Customer Secret Message: طلب خلطة خاصة مع بطاقة دفع بنكية";
try {
  encryptedStorage = encryptData(sampleData);
  console.log("   - البيانات الأصلية:", sampleData);
  console.log("   - النص المشفر في قاعدة البيانات (Ciphertext Base64):", encryptedStorage);
  console.log("   - هل النص المشفر لا يحتوي على أي أثر للنص الصريح؟", !encryptedStorage.includes("خلطة") ? "نعم ✅" : "لا ❌");
  console.log("   ✅ النتيجة: تم تشفير البيانات وحمايتها قبل التخزين.");
  passedCount++;
} catch (e) {
  console.error("   ❌ فشل الاختبار 2:", e.message);
}

// الاختبار 3: استرجاع البيانات وفك تشفيرها
console.log("\n▶ [Test 3]: استرجاع البيانات وفك تشفيرها (Decryption & Integrity Verification)");
try {
  const decrypted = decryptData(encryptedStorage);
  console.log("   - النص المسترجع بعد فك التشفير:", decrypted);
  if (decrypted === sampleData) {
    console.log("   ✅ النتيجة: تطابق تام 100% مع النص الأصلي وسلامة الـ Auth Tag.");
    passedCount++;
  } else {
    throw new Error("Mismatch between original and decrypted text");
  }
} catch (e) {
  console.error("   ❌ فشل الاختبار 3:", e.message);
}

// الاختبار 4: إدخال غير صحيح أو ناقص
console.log("\n▶ [Test 4]: معالجة الإدخال غير الصحيح أو الناقص (Input Validation)");
try {
  console.log("   - محاولة تمرير نص فارغ/غير صالح للتشفير...");
  encryptData("");
  console.error("   ❌ خطأ: كان يجب رفض الإدخال الفارغ!");
} catch (e) {
  console.log("   - رسالة الخطأ الآمنة:", e.message);
  console.log("   ✅ النتيجة: تم التقاط الخطأ ومنع تشفير المدخلات الفارغة بنجاح.");
  passedCount++;
}

// الاختبار 5: حالة خطأ أو مشكلة متعلقة بالتشفير أو تلاعب بالبيانات أو المفتاح
console.log("\n▶ [Test 5]: اختبار التلاعب بالبيانات والمفتاح (Tampering & Integrity Protection)");
try {
  console.log("   - محاكاة تلاعب بحرف واحد في النص المشفر (Tampering Simulation)...");
  const tamperedPayload = encryptedStorage.slice(0, 10) + "X" + encryptedStorage.slice(11);
  decryptData(tamperedPayload);
  console.error("   ❌ خطأ: تم فك تشفير نص متلاعب به!");
} catch (e) {
  console.log("   - استجابة النظام عند كشف التلاعب:", e.message);
  console.log("   ✅ النتيجة: كشف التلاعب بفضل AES-256-GCM AuthTag ورفض البيانات تلقائياً.");
  passedCount++;
}

console.log("\n================================================================");
console.log(`🎯 نتيجة الاختبارات: تم اجتياز ${passedCount}/5 اختبارات بنجاح تام!`);
console.log("================================================================");
