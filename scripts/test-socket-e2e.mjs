/**
 * Socket.IO E2E smoke test (local).
 * Usage: node scripts/test-socket-e2e.mjs
 */
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const require = createRequire(import.meta.url);
const { io } = require(
  resolve(__dirname, "../../myAcademy-portal/node_modules/socket.io-client/dist/socket.io.js")
);

const API = (process.env.API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

async function login() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim();
  const password = process.env.SUPER_ADMIN_PASSWORD?.trim();
  if (!email || !password) throw new Error("SUPER_ADMIN_EMAIL/PASSWORD missing");

  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!json.data?.token) throw new Error(`Login failed: ${json.message ?? res.status}`);
  return json.data.token;
}

function tryConnect(token) {
  return new Promise((resolve) => {
    const socket = io(API, {
      path: "/socket.io",
      auth: token ? { token } : {},
      transports: ["websocket"],
      timeout: 8000,
      reconnection: false,
    });
    const timer = setTimeout(() => {
      socket.close();
      resolve({ ok: false, error: "timeout" });
    }, 10000);
    socket.on("connect", () => {
      clearTimeout(timer);
      const id = socket.id;
      socket.close();
      resolve({ ok: true, id });
    });
    socket.on("connect_error", (err) => {
      clearTimeout(timer);
      socket.close();
      resolve({ ok: false, error: err.message });
    });
  });
}

function waitForAdminPending(token) {
  return new Promise((resolve, reject) => {
    const socket = io(API, {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket"],
      reconnection: false,
    });
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error("admin:pending timeout"));
    }, 12000);
    socket.on("connect", () => {
      void fetch(`${API}/api/public/contact-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "E2E Socket Test",
          email: "e2e-socket@test.local",
          subject: "Socket realtime smoke test",
          message: "Automated test — safe to delete.",
        }),
      });
    });
    socket.on("admin:pending", (payload) => {
      clearTimeout(timer);
      socket.close();
      resolve(payload.reason ?? "received");
    });
    socket.on("connect_error", (err) => {
      clearTimeout(timer);
      socket.close();
      reject(err);
    });
  });
}

console.log("=== Socket.IO E2E ===");
console.log("API:", API);

const pollingStatus = await fetch(`${API}/socket.io/?EIO=4&transport=polling`).then((r) => r.status);
console.log("POLLING_HANDSHAKE:", pollingStatus === 200 ? "PASS" : `FAIL (${pollingStatus})`);

const noAuth = await tryConnect();
console.log("NO_AUTH:", noAuth.ok ? "FAIL" : `PASS (${noAuth.error})`);

const badToken = await tryConnect("invalid.jwt");
console.log("BAD_TOKEN:", badToken.ok ? "FAIL" : `PASS (${badToken.error})`);

const token = await login();
const authed = await tryConnect(token);
console.log("VALID_JWT:", authed.ok ? `PASS (${authed.id})` : `FAIL (${authed.error})`);

const pendingReason = await waitForAdminPending(token);
console.log(
  "ADMIN_PENDING_EVENT:",
  pendingReason === "contact-message" ? "PASS" : `FAIL (${pendingReason})`
);

console.log("\nPortal VITE_SOCKET_URL should be:", API);
