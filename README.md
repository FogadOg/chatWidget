# Chat Widget with API Integration

This is a Next.js chat widget that integrates with the Companin's AI assistant API.

## Features

- Collapsible chat interface
- Real-time messaging with AI assistant
- API key authentication
- Transparent iframe embedding
- Two widget types: Sessions and Conversations

## Widget Types

### Sessions Widget (`/embed`)
Uses the sessions API endpoint for chat functionality. Sessions automatically manage conversation lifecycle and provide features like:
- Automatic conversation creation
- Session expiration handling
- Built-in rate limiting per session

### Conversations Widget (`/embed/conversation`)
Uses the conversations API endpoint directly. Provides more control over conversation management:
- Direct conversation management
- Persistent conversations across sessions
- More granular control over conversation lifecycle

Choose the sessions widget for simpler integration, or the conversations widget for more advanced use cases.

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
- `assistantId`: The UUID of the assistant to use for chat
- `customerId` (Conversations widget only): Unique identifier for the user/customer to maintain conversation persistence

### Optional Parameters

- `locale`: Language code for widget localization (en, de, es, fr, pt, sv, nl, nb, it). Defaults to English if not provided.
- `startOpen`: Controls initial widget state ("true"/"1" = open, "false"/"0" = closed). Defaults to closed.

- `customerId`: For conversations widget, this maintains persistent conversations. If not provided, a random ID will be generated.

### Conversation Persistence

The **Conversations Widget** maintains persistent conversations for each `customerId`:

- **First visit**: Creates a new conversation for the customer
- **Return visits**: Loads existing conversation and message history
- **Same customer, different assistants**: Each assistant gets its own conversation
- **Conversation status**: Only active conversations are resumed

This ensures users can continue conversations across sessions and devices.

### Embedding Examples

#### Sessions Widget
```html
<iframe
  src="http://localhost:3001/embed?apiKey=YOUR_API_KEY&assistantId=YOUR_ASSISTANT_ID"
  width="400"
  height="600"
  style="border: none; background: transparent;"
  title="Chat Widget"
/>
```

#### Conversations Widget
```html
<iframe
  src="http://localhost:3001/embed/conversation?apiKey=YOUR_API_KEY&assistantId=YOUR_ASSISTANT_ID"
  width="400"
  height="600"
  style="border: none; background: transparent;"
  title="Chat Widget"
/>
```
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

## Internationalization

The widget supports multiple languages through URL parameters:

- `en` - English (default)
- `de` - German
- `es` - Spanish
- `fr` - French
- `pt` - Portuguese
- `sv` - Swedish
- `nl` - Dutch
- `nb` - Norwegian Bokmål
- `it` - Italian

### Usage

Add the `locale` parameter to your widget URL:

```html
<iframe
  src="http://localhost:3001/embed?apiKey=YOUR_API_KEY&assistantId=YOUR_ASSISTANT_ID&locale=de"
  width="400"
  height="600"
  style="border: none;"
  title="Chat Widget"
/>
```

### Adding New Languages

1. Create a new JSON file in `/locales/` (e.g., `it.json`)
2. Add translations for all keys from `en.json`
3. Update the `LOCALES` object in `/lib/i18n.ts`
4. Update the `useWidgetTranslation` hook to include the new locale

## Error Handling

The widget displays user-friendly error messages for:
- Missing API key or assistant ID
- Network connectivity issues
- Invalid API credentials
- Session creation failures
