# Source Transparency - Quick Reference

## What Was Added

✅ **Source information in chat responses** - Users can now see which documents the AI used to answer their questions

## Visual Example

```
┌─────────────────────────────────────┐
│  User: What's your pricing?         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Assistant:                           │
│                                      │
│ Our pricing starts at $29/month     │
│ for the basic plan...                │
│                                      │
│ ─────────────────────────────────   │
│ 📚 Sources (2):                      │
│  • Pricing Page                      │
│    — We offer three pricing tiers... │
│  • FAQ: Billing                      │
│    — Monthly and annual billing...   │
└─────────────────────────────────────┘
```

## For Users

When the assistant answers your question, you'll see:
- **📚 Sources** section at the bottom of the response
- **Number of sources** used (e.g., "Sources (3)")
- **Source titles** - name of the document/page
- **Short previews** - a snippet of the relevant text
- **Clickable links** - if the source is a webpage

## For Developers

### Backend API Response
```json
{
  "status": "success",
  "data": {
    "assistant_message": {
      "id": "msg-123",
      "sender": "assistant",
      "content": "Here's the answer...",
      "sources": [
        {
          "type": "knowledge_url",
          "title": "Pricing Page",
          "snippet": "We offer three pricing tiers...",
          "url": "https://example.com/pricing",
          "reference_id": "kb-456"
        }
      ]
    }
  }
}
```

### Message Type
```typescript
type Message = {
  id: string;
  text: string;
  from: 'user' | 'assistant';
  sources?: Array<{
    type: string;
    title: string;
    snippet?: string;
    url?: string;
    reference_id?: string;
  }>;
};
```

## Files Modified

### Backend (Python)
1. `assistantApp/assistant_api/services/chat_responder.py`
   - Added source formatting in `generate_assistant_reply()`

2. `assistantApp/assistant_api/endpoints/sessions.py`
   - Updated `_serialize_message()` to expose sources

### Frontend (TypeScript/React)
1. `widget-app/components/EmbedShell.tsx`
   - Added source display UI for both views
   - Updated Message type

2. `widget-app/app/embed/session/EmbedClient.tsx`
   - Added sources to message mapping
   - Updated Message type

## Testing Steps

1. ✅ Backend returns sources in API response
2. ✅ Frontend receives and stores sources
3. ✅ Sources display in chat widget
4. ✅ Links are clickable (when URL available)
5. ✅ Snippets show preview text

To manually test:
```bash
# Start backend
cd assistantApp
python manage.py runserver

# Start widget
cd widget-app
npm run dev

# Open widget and ask a question related to your knowledge base
```

## Notes

- Sources only appear for assistant messages (not user messages)
- Only shows when sources are available from knowledge base
- Snippet text is truncated to 80 characters for readability
- URLs open in new tab with security attributes (noopener noreferrer)
- Works in both embedded and standalone widget views
