const { google } = require("googleapis");

const calendarId =
  "f27a218c76e60ea7473ed0c62a7b07820b6e824bfdd4421fe34353763ce04a19@group.calendar.google.com";
const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

// 환경 변수 또는 서비스 계정 파일에서 인증 정보 로드
function getAuthCredentials() {
  console.log("🔍 Checking environment variables...");
  console.log("GOOGLE_CLIENT_EMAIL exists:", !!process.env.GOOGLE_CLIENT_EMAIL);
  console.log("GOOGLE_PRIVATE_KEY exists:", !!process.env.GOOGLE_PRIVATE_KEY);
  console.log(
    "GOOGLE_SERVICE_ACCOUNT_BASE64 exists:",
    !!process.env.GOOGLE_SERVICE_ACCOUNT_BASE64
  );

  // 방법 1: Base64로 인코딩된 전체 서비스 계정 사용 (가장 안전)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
    console.log("✅ Using Base64 encoded service account");
    try {
      const serviceAccountJson = Buffer.from(
        process.env.GOOGLE_SERVICE_ACCOUNT_BASE64,
        "base64"
      ).toString("utf8");
      const serviceAccount = JSON.parse(serviceAccountJson);
      console.log(
        "🔑 Decoded service account client_email:",
        serviceAccount.client_email
      );
      return serviceAccount;
    } catch (error) {
      console.error(
        "❌ Failed to decode Base64 service account:",
        error.message
      );
      throw new Error("Invalid Base64 encoded service account");
    }
  }

  if (process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CLIENT_EMAIL) {
    console.log("✅ Using environment variables for authentication");

    // Private key 처리 개선
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;

    console.log("🔑 Raw private key length:", privateKey.length);
    console.log(
      "🔑 Raw private key sample:",
      privateKey.substring(0, 100) + "..."
    );

    // 따옴표 제거 (만약 있다면)
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
      console.log("📝 Removed quotes from private key");
    }

    // 개행 문자 처리 - 더 안전하게
    if (privateKey.includes("\\n")) {
      privateKey = privateKey.replace(/\\n/g, "\n");
      console.log("📝 Converted \\n to actual newlines");
    }

    // 기본적인 private key 형식 검증
    if (
      !privateKey.includes("-----BEGIN PRIVATE KEY-----") ||
      !privateKey.includes("-----END PRIVATE KEY-----")
    ) {
      throw new Error("Invalid private key format. Missing BEGIN/END markers.");
    }

    console.log(
      "🔑 Processed private key starts with:",
      privateKey.substring(0, 50) + "..."
    );
    console.log(
      "🔑 Processed private key ends with:",
      "..." + privateKey.substring(privateKey.length - 50)
    );

    return {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey,
    };
  } else {
    console.log(
      "⚠️ Environment variables not found, trying service account file..."
    );
    try {
      // Vercel에서는 루트 경로에서 파일을 찾도록 수정
      const key = require("../service-account.json");
      console.log("✅ Using service account file for authentication");
      return key;
    } catch (error) {
      console.error("❌ Service account file not found:", error.message);
      throw new Error(
        "No authentication credentials found. Please set environment variables (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) or add service-account.json file."
      );
    }
  }
}

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method Not Allowed" });
    }

    console.log("📩 Webhook request:", req.body);

    // 요청 데이터 검증
    if (!req.body.queryResult) {
      return res.status(400).json({
        error: "Invalid request format",
        fulfillmentText: "요청 형식이 올바르지 않습니다.",
      });
    }

    const paramTime = req.body.queryResult.parameters["date-time"];
    const requestedTime = paramTime ? new Date(paramTime) : new Date();

    console.log("📅 Requested time:", requestedTime);

    const checkStart = new Date(requestedTime);
    checkStart.setHours(checkStart.getHours() - 6);
    const checkEnd = new Date(requestedTime);
    checkEnd.setHours(checkEnd.getHours() + 3);

    // 인증 정보 로드
    const credentials = getAuthCredentials();

    const jwtClient = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      SCOPES
    );

    await jwtClient.authorize();

    const calendar = google.calendar({ version: "v3", auth: jwtClient });

    console.log(
      "📊 Checking calendar from",
      checkStart.toISOString(),
      "to",
      checkEnd.toISOString()
    );

    const result = await calendar.events.list({
      calendarId,
      timeMin: checkStart.toISOString(),
      timeMax: checkEnd.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = result.data.items || [];
    console.log("📋 Found", events.length, "events");

    let available = true;
    let closestEnd = null;

    for (let event of events) {
      const start = new Date(event.start.dateTime || event.start.date);
      const end = new Date(event.end.dateTime || event.end.date);

      console.log("🔍 Event:", event.summary, "from", start, "to", end);

      if (end <= requestedTime) {
        if (!closestEnd || end > closestEnd) closestEnd = end;
      } else if (start <= requestedTime && end >= requestedTime) {
        available = false;
      }
    }

    let message = "";
    if (!available) {
      message = "해당 시간은 기존 예약과 겹쳐 이용이 어렵습니다.";
    } else if (
      closestEnd &&
      (requestedTime - closestEnd) / (1000 * 60 * 60) < 2
    ) {
      message = "해당 시간은 이전 예약과 2시간 간격이 없어 세팅이 어렵습니다.";
    } else {
      message =
        "요청하신 시간은 예약 가능합니다! 변경 원하시면 말씀해주세요 😊";
    }

    console.log("✅ Response:", message);
    res.status(200).json({ fulfillmentText: message });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({
      error: "Internal server error",
      fulfillmentText:
        "서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      details: error.message,
    });
  }
};
