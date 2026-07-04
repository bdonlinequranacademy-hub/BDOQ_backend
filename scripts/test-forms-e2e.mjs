/**
 * E2E smoke test for public marketing forms + admin inbox.
 * Usage: node scripts/test-forms-e2e.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const API = (process.env.API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
const SITE = process.env.PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
const PNG = resolve(
  __dirname,
  "../../public-site/public/images/teachers/male-teacher.png"
);
const ts = Date.now();

async function postJson(path, body) {
  const res = await fetch(`${API}/api/public/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function loginAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim();
  const password = process.env.SUPER_ADMIN_PASSWORD?.trim();
  if (!email || !password) throw new Error("Admin credentials missing in .env");

  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!json.data?.token) throw new Error("Admin login failed");
  return json.data.token;
}

async function adminCount(token, path) {
  const res = await fetch(`${API}/api/admin/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  const data = json.data;
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data?.items)) return data.items.length;
  if (Array.isArray(data?.bookings)) return data.bookings.length;
  if (Array.isArray(data?.applications)) return data.applications.length;
  if (Array.isArray(data?.messages)) return data.messages.length;
  return 0;
}

async function submitTeacherApplication() {
  const form = new FormData();
  const data = {
    fullName: `E2E Teacher ${ts}`,
    email: `e2e-teacher-${ts}@test.local`,
    phone: "+8801911112222",
    whatsapp: "+8801911112222",
    locale: "en",
    rulesAccepted: true,
  };
  form.append("data", JSON.stringify(data));
  const buf = readFileSync(PNG);
  const blob = new Blob([buf], { type: "image/png" });
  form.append("certificateFile", blob, "cert.png");
  form.append("cvFile", blob, "cv.png");
  form.append("profilePhotoFile", blob, "photo.png");

  const res = await fetch(`${API}/api/public/teacher-applications`, {
    method: "POST",
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

console.log("=== 7.x FORMS E2E ===");
console.log("Site:", SITE);
console.log("API:", API);

for (const path of ["/free-class", "/student-admission", "/teacher-registration", "/contact"]) {
  const res = await fetch(`${SITE}${path}`);
  console.log(res.ok ? "PASS" : "FAIL", `page ${path} -> ${res.status}`);
}

const contact = await postJson("contact-messages", {
  name: `E2E Contact ${ts}`,
  email: `e2e-contact-${ts}@test.local`,
  subject: "E2E Forms Batch",
  message: "Automated test — safe to delete.",
  locale: "en",
});
console.log(
  contact.ok ? "PASS" : "FAIL",
  `7.4 contact API -> ${contact.status}`,
  contact.json.data?.id ?? contact.json.message ?? ""
);

const trial = await postJson("trial-bookings", {
  parentName: `E2E Parent ${ts}`,
  email: `e2e-trial-${ts}@test.local`,
  whatsapp: "+8801923456789",
  country: "BD",
  learnerType: "child",
  timeSlot: "evening",
  teacherPreference: "female",
  preferredDays: ["mon", "wed"],
  timezone: "Asia/Dhaka",
  source: "e2e-test",
});
console.log(
  trial.ok ? "PASS" : "FAIL",
  `7.1 trial API -> ${trial.status}`,
  trial.json.data?.id ?? trial.json.message ?? ""
);

const admission = await postJson("student-admissions", {
  fullName: `E2E Student ${ts}`,
  email: `e2e-admission-${ts}@test.local`,
  whatsapp: "+8801987654321",
  country: "BD",
  locale: "en",
  guardianName: "E2E Guardian",
  termsAccepted: true,
});
console.log(
  admission.ok ? "PASS" : "FAIL",
  `7.2 admission API -> ${admission.status}`,
  admission.json.data?.id ?? admission.json.message ?? ""
);

let teacher;
try {
  teacher = await submitTeacherApplication();
} catch (err) {
  teacher = { ok: false, status: 0, json: { message: String(err) } };
}
console.log(
  teacher.ok ? "PASS" : "FAIL",
  `7.3 teacher API -> ${teacher.status}`,
  teacher.json.data?.id ?? teacher.json.message ?? ""
);

try {
  const token = await loginAdmin();
  const counts = await Promise.all([
    adminCount(token, "trial-bookings?status=new"),
    adminCount(token, "contact-messages?status=new"),
    adminCount(token, "student-admissions?status=new"),
    adminCount(token, "teacher-applications?status=new"),
  ]);
  console.log("PASS admin inbox counts:", counts.join(" / "));
} catch (err) {
  console.log("FAIL admin inbox:", err instanceof Error ? err.message : err);
}
