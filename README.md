# Autumnchat

A calendar webhook service that checks appointment availability using Google Calendar API.

## Features

- Checks calendar availability for requested time slots
- Ensures 2-hour setup time between appointments
- Provides friendly responses for booking inquiries
- Integrates with Google Calendar API

## Setup

1. Install dependencies:

```bash
npm install
```

2. Set up Google Service Account:

   - Create a service account in Google Cloud Console
   - Download the service account key file
   - Rename it to `service-account.json` and place it in the root directory

3. Configure Calendar ID:
   - Update the `calendarId` variable in `index.js` with your Google Calendar ID

## Usage

```bash
npm start
```

The server will start on port 3000 (or the PORT environment variable).

## API Endpoints

### POST /webhook

Checks availability for the current time (can be extended to accept user input).

**Response:**

```json
{
  "fulfillmentText": "요청하신 시간은 예약 가능합니다! 변경 원하시면 말씀해주세요 😊"
}
```

## Environment Variables

- `PORT`: Server port (default: 3000)

## Dependencies

- Express.js: Web framework
- Google APIs: Calendar API integration
- Body Parser: JSON request parsing
