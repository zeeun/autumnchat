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
   - Update the `calendarId` variable in `api/webhook.js` with your Google Calendar ID

## Environment Variables for Production

For production deployment (especially on platforms like Vercel), set these environment variables:

```bash
GOOGLE_CLIENT_EMAIL=your-service-account-email@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"
```

**Note:** When setting `GOOGLE_PRIVATE_KEY`, make sure to wrap it in quotes and replace actual newlines with `\n`.

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set the environment variables in Vercel dashboard:
   - `GOOGLE_CLIENT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
4. Deploy

### Local Development

```bash
npm start
```

The server will start on port 3000 (or the PORT environment variable).

## API Endpoints

### POST /api/webhook

Checks availability for the specified time (or current time if not specified).

**Request:**

```json
{
  "queryResult": {
    "parameters": {
      "date-time": "2025-07-12T12:00:00+09:00"
    }
  }
}
```

**Response:**

```json
{
  "fulfillmentText": "요청하신 시간은 예약 가능합니다! 변경 원하시면 말씀해주세요 😊"
}
```

## Error Handling

The webhook now includes comprehensive error handling:

- Authentication errors
- Invalid request format
- Calendar API errors
- Network connectivity issues

## Troubleshooting

### Common Issues

1. **Authentication Error**: Make sure your service account has calendar read permissions
2. **Calendar Not Found**: Verify the calendar ID is correct
3. **Private Key Error**: Ensure newlines in the private key are properly formatted as `\n`

### Debug Information

The webhook logs detailed information in development mode:

- Request parameters
- Calendar events found
- Processing steps
- Final response

## Dependencies

- Express.js: Web framework
- Google APIs: Calendar API integration
- Body Parser: JSON request parsing
