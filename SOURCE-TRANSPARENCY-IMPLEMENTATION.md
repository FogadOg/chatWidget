# Source Transparency Implementation

## Overview
This document describes the implementation of source transparency in the chat widget, allowing users to see which documents/pages the AI assistant used to generate answers.

## Features Implemented

### 1️⃣ Source Display
- **Show which doc/page the answer came from**: Each assistant response now displays a "Sources" section at the bottom
- **Link to the exact section**: If a source has a URL, it's displayed as a clickable link
- **Highlight quoted text**: Sources show the title and a snippet of the relevant text (truncated to 80 characters for readability)

## Implementation Details

### Backend Changes

#### 1. Modified `chat_responder.py`
**File**: `/assistantApp/assistant_api/services/chat_responder.py`

- Added source formatting in `generate_assistant_reply` function
- Sources are extracted from `knowledge_hits` and formatted into a structured array
- Each source includes:
  - `type`: The source type (knowledge_base, knowledge_qa, knowledge_url)
  - `title`: The document/page title
  - `snippet`: A preview of the relevant content
  - `url`: If available (for URLs)
  - `reference_id`: Internal ID for tracking

**Changes**:
```python
# Format sources for frontend display
sources = []
for hit in knowledge_hits:
    source_data = {
        "type": hit.get("source", "unknown"),
        "title": hit.get("title", "Unknown"),
        "snippet": hit.get("snippet", ""),
        "reference_id": hit.get("reference_id", ""),
    }
    if hit.get("url"):
        source_data["url"] = hit["url"]
    sources.append(source_data)

response_metadata["sources"] = sources  # Add to metadata
```

#### 2. Modified `sessions.py`
**File**: `/assistantApp/assistant_api/endpoints/sessions.py`

- Updated `_serialize_message` to explicitly expose sources
- Sources are extracted from message metadata and included in the API response

**Changes**:
```python
def _serialize_message(message: Message) -> Dict[str, Any]:
    # Extract sources from metadata if available
    sources = []
    if message.metadata and isinstance(message.metadata, dict):
        sources = message.metadata.get('sources', [])

    return {
        'id': str(message.id),
        'sender': message.sender,
        'content': message.content,
        'metadata': message.metadata,
        'sources': sources,  # Explicitly expose sources for frontend
        'created_at': message.created_at.isoformat(),
    }
```

### Frontend Changes

#### 1. Updated Message Type Definitions
**Files**:
- `/widget-app/components/EmbedShell.tsx`
- `/widget-app/app/embed/session/EmbedClient.tsx`

Added `SourceData` type and updated `Message` type to include sources:

```typescript
type SourceData = {
  type: string;
  title: string;
  snippet?: string;
  url?: string;
  reference_id?: string;
};

type Message = {
  id: string;
  text: string;
  from: 'user' | 'assistant';
  timestamp?: number;
  sources?: SourceData[];
};
```

#### 2. Updated EmbedClient Message Loading
**File**: `/widget-app/app/embed/session/EmbedClient.tsx`

Modified `loadSessionMessages` to include sources when mapping API messages:

```typescript
.map((msg: any) => ({
  id: msg.id,
  text: msg.content,
  from: msg.sender as 'user' | 'assistant',
  timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now(),
  sources: msg.sources || [],  // Include sources from API
}));
```

#### 3. Updated EmbedShell Display Component
**File**: `/widget-app/components/EmbedShell.tsx`

Added source display section for assistant messages in both embedded and standalone views:

```tsx
{hasSources && (
  <div className="mt-2 pt-2 border-t border-gray-300">
    <div className="text-xs font-semibold mb-1 opacity-70">
      📚 Sources ({message.sources!.length}):
    </div>
    <div className="space-y-1">
      {message.sources!.map((source, idx) => (
        <div key={idx} className="text-xs">
          {source.url ? (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline flex items-start gap-1"
            >
              <span className="opacity-70">•</span>
              <span className="flex-1">
                <span className="font-medium">{source.title}</span>
                {source.snippet && (
                  <span className="opacity-70"> — {source.snippet.substring(0, 80)}...</span>
                )}
              </span>
            </a>
          ) : (
            <div className="flex items-start gap-1">
              <span className="opacity-70">•</span>
              <span className="flex-1">
                <span className="font-medium">{source.title}</span>
                {source.snippet && (
                  <span className="opacity-70"> — {source.snippet.substring(0, 80)}...</span>
                )}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
)}
```

## Visual Design

### Source Display Appearance
- **Location**: Directly below the assistant's message text
- **Separator**: Light gray border-top to distinguish from message content
- **Icon**: 📚 emoji to indicate sources
- **Count**: Shows number of sources used
- **Links**: URLs are clickable and open in new tab
- **Snippets**: Truncated to 80 characters with ellipsis for readability
- **Styling**:
  - Small font size (text-xs)
  - Reduced opacity for snippets (opacity-70)
  - Bullet points for each source
  - Hover effect on links (underline)

## How It Works

1. **User sends a message** → Widget calls `/sessions/{session_id}/messages` endpoint

2. **Backend processes the query**:
   - Searches knowledge base using RAG (Retrieval-Augmented Generation)
   - Finds relevant documents, Q&As, and URLs
   - Generates response using OpenAI with context from sources
   - Formats sources into structured array
   - Stores sources in message metadata

3. **Frontend receives response**:
   - Extracts sources from API response
   - Displays assistant message with sources section
   - Shows source title, snippet, and link (if available)

4. **User sees transparency**:
   - Can verify information source
   - Can click links to read full documents
   - Can see which knowledge base items were used

## Testing

To test the implementation:

1. **Add knowledge base content** in the admin dashboard
2. **Send a question** in the widget that relates to the knowledge base
3. **Verify sources appear** below the assistant's response
4. **Check clickable links** work for URL-based sources
5. **Verify snippet preview** shows relevant content

## Benefits

✅ **Transparency**: Users can see where information comes from
✅ **Trust**: Builds confidence in AI responses
✅ **Verification**: Users can verify information by following links
✅ **Context**: Snippets provide quick preview of source content
✅ **MVP Ready**: Simple, clean implementation without over-engineering

## Future Enhancements (Optional)

- Collapsible sources section (to save space)
- Highlight matching text in sources
- Show confidence score for each source
- Filter sources by type (docs, Q&A, URLs)
- Source preview on hover
