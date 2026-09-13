import { sendSMS, isSmsConfigured } from "../src/services/smsService";
import { config } from "dotenv";
import path from "path";

// Load .env explicitly for tests
config({ path: path.join(__dirname, "../.env") });

async function runSmsTests() {
  console.log("=== Running SMS Integration Local Tests ===\n");

  const originalTestMode = process.env.BULKSMS_SMS_TEST_MODE;
  const originalApiKey = process.env.BULKSMS_API_KEY;

  // Test 1: Missing API Configuration
  console.log("Test 1: Missing API Configuration");
  process.env.BULKSMS_API_KEY = ""; // Temporarily break config
  const missingConfigResult = await sendSMS("01711111111", "Test message");
  console.log("Result:", missingConfigResult);
  console.assert(missingConfigResult.success === false, "Should fail due to missing config");
  console.assert(missingConfigResult.status === "CONFIG_ERROR", "Status should be CONFIG_ERROR");

  // Restore config
  process.env.BULKSMS_API_KEY = originalApiKey;
  process.env.BULKSMS_SMS_TEST_MODE = "true"; // Ensure test mode is ON for remaining tests to avoid real charges

  if (!isSmsConfigured()) {
    console.error("FATAL: Cannot run remaining tests because valid credentials are not present in .env");
    return;
  }

  // Note: Controller handles valid/invalid phone & empty message logic, but we can test the service's internal handling
  // For standard service level tests with valid data (Test mode)
  console.log("\nTest 2: Successful Simulated Gateway Response");
  const successResult = await sendSMS("01711111111", "Valid message");
  console.log("Result:", successResult);
  console.assert(successResult.success === true, "Should succeed in test mode");
  console.assert(successResult.status === "1000", "Status should be 1000");

  // Let's test error parsing logic. We can do this by mocking the fetch call.
  console.log("\nTest 3: Gateway Error Responses (Mocking fetch)");
  process.env.BULKSMS_SMS_TEST_MODE = "false"; // Disable test mode to hit fetch, but mock fetch globally

  const originalFetch = global.fetch;
  
  // Polyfill jest mock function just for this standalone script
  const mockJest = {
    fn: () => {
      let resolveValue: any;
      const f = async () => resolveValue;
      f.mockResolvedValue = (val: any) => { resolveValue = val; return f; };
      return f;
    }
  };
  const g = global as any;
  g.jest = mockJest;

  const testErrorResponse = async (status: string, message: string, expectedInternalMessage: string) => {
    global.fetch = mockJest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ Status: status, Message: message }),
    }) as any;
    const res = await sendSMS("01711111111", "Test");
    console.log(`Testing status ${status}... Result:`, res.success === false && res.message.includes(expectedInternalMessage) ? "PASSED" : "FAILED");
  };

  await testErrorResponse("2001", "Insufficient Balance", "Insufficient SMS balance");
  await testErrorResponse("1015", "Auth failed", "Authorization failed");
  await testErrorResponse("1011", "Sender ID error", "Sender ID not found");
  await testErrorResponse("1009", "Not verified", "Account is not verified");
  await testErrorResponse("1008", "IP error", "IP not whitelisted");
  await testErrorResponse("1006", "Content error", "SMS content validation failed");
  await testErrorResponse("1005", "Spam", "Spam content detected");
  await testErrorResponse("1003", "Request failed", "Request failed");

  // Gateway HTTP failure
  g.fetch = mockJest.fn().mockResolvedValue({
    ok: false,
    status: 500,
    statusText: "Internal Server Error"
  });
  const httpFail = await sendSMS("01711111111", "Test");
  console.log("Testing HTTP Failure... Result:", httpFail.success === false && httpFail.status === "500" ? "PASSED" : "FAILED");

  // Restore global state
  global.fetch = originalFetch;
  process.env.BULKSMS_SMS_TEST_MODE = originalTestMode;

  console.log("\n=== Tests Completed ===");
}

runSmsTests().catch(console.error);
