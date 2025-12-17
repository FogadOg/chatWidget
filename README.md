# Chat Widget with API Integration

This is a Next.js chat widget that integrates with the Companin's AI assistant API.

## Features

- Collapsible chat interface
- Real-time messaging with AI assistant
- API key authentication
- Transparent iframe embedding

## API Integration

The widget connects to the Companin's Django API backend for chat functionality.

### Configuration

Create a `.env.local` file in the widget-app directory:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

### Required Parameters

When embedding the widget, you must provide these URL parameters:

- `apiKey`: Your organization's API key (client_id from OAuth application)
- `assistantId`: UUID of the assistant to chat with

### Example Usage

```html
<iframe
  src="http://localhost:3001/embed?apiKey=YOUR_API_KEY&assistantId=YOUR_ASSISTANT_ID"
  width="400"
  height="600"
  style="border: none; position: fixed; bottom: 16px; right: 16px; z-index: 1000; background-color: transparent;"
  title="Embedded Chat Widget"
/>
```

### Getting API Credentials

1. **API Key**: This is your OAuth application's `client_id`. You can find it in your Django admin under OAuth Applications.

2. **Assistant ID**: Create an assistant through the API or Django admin, then use its UUID.

### API Endpoints Used

- `POST /api/v1/sessions/` - Create a chat session
- `POST /api/v1/sessions/{session_id}/messages` - Send messages and receive AI responses

## Development

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3001/embed](http://localhost:3001/embed) with your browser to see the widget.

## Configuration

The widget automatically:
- Parses URL parameters for API configuration
- Creates a session on load
- Handles authentication with X-API-Key header
- Displays error messages for API failures

## Error Handling

The widget displays user-friendly error messages for:
- Missing API key or assistant ID
- Network connectivity issues
- Invalid API credentials
- Session creation failures
