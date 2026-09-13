export interface SendSmsResult {
  success: boolean;
  status: string;
  message: string;
}

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.BULKSMS_API_KEY &&
      process.env.BULKSMS_SENDER_ID &&
      process.env.BULKSMS_API_KEY.trim() !== "" &&
      process.env.BULKSMS_SENDER_ID.trim() !== ""
  );
}

function parseSmsError(statusCode: string, fallbackMessage: string): string {
  if (fallbackMessage && fallbackMessage !== "SMS failed") {
    return fallbackMessage;
  }
  
  switch (statusCode) {
    case "2001":
      return "Insufficient SMS balance";
    case "1015":
      return "Authorization failed. Check API key.";
    case "1011":
      return "Sender ID not found by API key";
    case "1009":
      return "Account is not verified";
    case "1008":
      return "IP not whitelisted";
    case "1006":
      return "SMS content validation failed";
    case "1005":
      return "Spam content detected";
    case "1003":
      return "Request failed";
    default:
      return fallbackMessage || `Unknown API error (Code: ${statusCode})`;
  }
}

export async function sendSMS(number: string, message: string): Promise<SendSmsResult> {
  if (!isSmsConfigured()) {
    return {
      success: false,
      status: "CONFIG_ERROR",
      message: "Bulk SMS credentials are not configured on the server.",
    };
  }

  const apiKey = process.env.BULKSMS_API_KEY!.trim();
  const callerId = process.env.BULKSMS_SENDER_ID!.trim();

  // Normalize phone number to BulkSMS Dhaka expected format
  let normalizedNumber = number.replace(/\D/g, "");
  if (normalizedNumber.startsWith("01") && normalizedNumber.length === 11) {
    normalizedNumber = `88${normalizedNumber}`;
  } else if (normalizedNumber.startsWith("8801")) {
    // Already in correct format
  }

  const params = new URLSearchParams();
  params.append("api_key", apiKey);
  params.append("senderid", callerId);
  params.append("number", normalizedNumber);
  params.append("message", message.trim());
  params.append("type", "text");

  if (process.env.BULKSMS_SMS_TEST_MODE === "true") {
    // Simulate successful API response
    return {
      success: true,
      status: "1000",
      message: "Your sms request successful!! (SIMULATED)",
    };
  }

  try {
    const response = await fetch("http://bulksmsbd.net/api/smsapi", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      return {
        success: false,
        status: String(response.status),
        message: `HTTP Error: ${response.status} ${response.statusText}`,
      };
    }

    const data = (await response.json()) as any;
    
    // bulksmsbd.net typically returns response_code: 202 on success
    const status = String(data.response_code || data.error_code || data.Status || "unknown");
    const isSuccess = status === "202" || status === "1000" || status === "200" || data.success_message;

    if (isSuccess) {
      return {
        success: true,
        status,
        message: data.success_message || data.Message || "SMS sent successfully",
      };
    }

    const errorMessage = parseSmsError(status, data.error_message || data.Message || "SMS failed");
    return {
      success: false,
      status,
      message: errorMessage,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown fetch error";
    return {
      success: false,
      status: "FETCH_ERROR",
      message: `Failed to connect to SMS gateway: ${errorMsg}`,
    };
  }
}
