# Widget Session Persistence Implementation

## Overview
This document describes the session persistence feature implemented to avoid creating new sessions when users reload the website.

## Key Features

### 1. **LocalStorage-based Session Persistence**
- Sessions are now stored in browser localStorage with a unique key per client/assistant combination
- Key format: `companin-session-{clientId}-{assistantId}`
- Stored data includes:
  - `sessionId`: The session identifier
  - `expiresAt`: Session expiration timestamp
  - `createdAt`: When the session was created

### 2. **Persistent Visitor ID**
- Each visitor gets a unique ID stored in localStorage
- Key format: `companin-visitor-{clientId}`
- Visitor ID persists across sessions and page reloads
- Format: `widget-{timestamp}-{randomString}`

### 3. **Session Validation on Load**
- When the widget loads, it checks for an existing session in localStorage
- If found, it validates the session by attempting to fetch messages
- If valid, the session is restored with all previous messages
- If invalid or expired, a new session is created

### 4. **Expiration Handling**
- Sessions have a 5-minute buffer before localStorage expiration (client-side check)
- Server-side sessions expire after 1 hour (as defined by SESSION_TTL)
- Expired sessions are automatically cleared from localStorage
- Message sending errors due to expired sessions trigger cleanup and user notification

### 5. **Periodic Expiry Checks**
- Every 60 seconds, the widget checks if the stored session has expired
- Automatically clears state when session expires

## Implementation Details

### Functions Added

#### `getSessionStorageKey()`
Returns the localStorage key for the current widget instance.

#### `getVisitorId()`
Gets or creates a persistent visitor ID for the current client.

#### `getStoredSession()`
Retrieves and validates stored session data from localStorage. Returns null if not found or expired.

#### `storeSession(sessionId, expiresAt)`
Stores session data in localStorage.

#### `validateAndRestoreSession(sessionId, assistantId, token)`
Validates an existing session by fetching its messages. If valid, restores the session. If invalid, creates a new session.

### Modified Functions

#### `createSession()`
- Now uses persistent visitor ID
- Stores session data in localStorage after creation
- Includes expiration timestamp

#### `handleSubmit()`
- Enhanced error handling for expired sessions
- Clears localStorage when session errors occur

## User Experience

1. **First Visit**: User opens widget → New session created → Session stored in localStorage
2. **Page Reload**: User reloads page → Existing session restored → Previous conversation visible
3. **Session Expires**: After 1 hour → Next message attempt fails → User notified → New session created on next interaction
4. **Different Tab**: User opens site in new tab → Same session restored (until expiry)

## Benefits

- ✅ Seamless user experience across page reloads
- ✅ Conversation history preserved during browsing session
- ✅ Automatic cleanup of expired sessions
- ✅ Persistent visitor tracking for analytics
- ✅ Reduces unnecessary server load from creating duplicate sessions
- ✅ Maintains security with proper expiration handling

## Technical Considerations

### Browser Compatibility
- Uses localStorage (supported in all modern browsers)
- Graceful fallback if localStorage is unavailable or blocked

### Privacy
- Data is stored only in the user's browser
- No cross-domain tracking
- Sessions automatically expire after 1 hour
- Users can clear localStorage to reset their session

### Error Handling
- Try-catch blocks protect against localStorage access errors
- Session validation prevents using invalid/expired sessions
- Automatic fallback to new session creation on any error

## Testing

To test the implementation:

1. Open the widget and start a conversation
2. Reload the page
3. Verify that:
   - The session ID remains the same (check console logs)
   - Previous messages are still visible
   - You can continue the conversation without issues
4. Wait for session expiration (or manually delete from localStorage)
5. Verify that a new session is created when sending a message

## Future Enhancements

Potential improvements:
- Add manual session reset button
- Implement session migration across devices (server-side)
- Add session analytics and tracking
- Implement session sharing via URL parameters
