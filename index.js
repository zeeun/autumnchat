const express = require("express");
const bodyParser = require("body-parser");
const { google } = require("googleapis");
const app = express();

app.use(bodyParser.json());

const calendarId =
  "f27a218c76e60ea7473ed0c62a7b07820b6e824bfdd4421fe34353763ce04a19@group.calendar.google.com";
const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
const key = require("./service-account.json");

app.post("/webhook", async (req, res) => {
  console.log(
    "📩 Received webhook request from Dialogflow:",
    req.body.queryResult
  );
  const requestedTime = new Date(); // 향후 사용자 입력으로 확장 가능

  const checkStart = new Date(requestedTime);
  checkStart.setHours(checkStart.getHours() - 6);
  const checkEnd = new Date(requestedTime);
  checkEnd.setHours(checkEnd.getHours() + 3);

  const jwtClient = new google.auth.JWT(
    key.client_email,
    null,
    key.private_key,
    SCOPES
  );

  await jwtClient.authorize();

  const calendar = google.calendar({ version: "v3", auth: jwtClient });
  const result = await calendar.events.list({
    calendarId,
    timeMin: checkStart.toISOString(),
    timeMax: checkEnd.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  const events = result.data.items;
  let available = true;
  let closestEnd = null;

  for (let event of events) {
    const start = new Date(event.start.dateTime || event.start.date);
    const end = new Date(event.end.dateTime || event.end.date);

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
    message = "요청하신 시간은 예약 가능합니다! 변경 원하시면 말씀해주세요 😊";
  }

  res.json({ fulfillmentText: message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server listening on port", PORT);
});
