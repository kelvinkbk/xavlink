# Read Receipts Debug Guide

## Overview
This guide helps diagnose why read receipts (double check ✓✓) aren't appearing when messages are marked as read.

## Testing Steps

### 1. Setup
- Open two browser tabs/windows with XavLink
- Log in as two different users (User A and User B)
- Open a direct chat or group chat between them

### 2. Testing Read Receipts
1. **Open Browser Console** (F12 → Console tab)
2. **User A sends a message** in the chat
3. **User B opens the chat** (or just makes sure User B can see the message)
4. **Watch the console** for logs from the frontend

### 3. Expected Console Logs (Frontend - User B's browser)

#### Phase 1: Messages Load
```
📚 Loaded X messages:
[
  { id: 'msg123', sender: 'userId_A', readReceiptsCount: 0, readReceipts: [] },
  ...
]
```
This shows messages are loaded. Check the readReceiptsCount - it should be 0 for the newly sent message.

#### Phase 2: Auto-mark as Read (500ms delay)
```
📖 markVisibleMessagesAsRead called with 1 messages
📖 Socket not connected, skipping mark as read  ← ⚠️ If you see this, socket isn't connected!
```

OR (if socket is connected):
```
📖 markVisibleMessagesAsRead called with 1 messages
📤 Marking message msg123 as read (API call)
✅ Message msg123 marked as read successfully
```

#### Phase 3: Socket Receives Update
```
📖 Socket received message_read: messageId=msg123, userId=userId_B
✅ Adding read receipt to message msg123 for user userId_B
```

#### Phase 4: UI Updates
```
📧 Message msg123 check status: ✓✓ (readReceipts: 1)
```
This should show ✓✓ instead of ✓.

### 4. Expected Console Logs (Backend - Terminal)

When User B sends the read receipt:
```
📖 markAsRead called: messageId=msg123, chatId=chatId_123, userId=userId_B
✅ Read receipt created for messageId=msg123, userId=userId_B
📡 Broadcasting message_read to room chatId_123
```

### 5. Diagnosis Flowchart

**User A's message shows ✓ but never changes to ✓✓?**

1. **Check console for Phase 2 logs**
   - NO logs appear → `markVisibleMessagesAsRead()` not being called
   - "Socket not connected" message → Socket connection issue
   - "Marking message X as read" appears → Check Phase 3

2. **Check console for Phase 3 logs**
   - NO "Socket received message_read" → Backend broadcast failed OR socket isn't joined to room
   - "Socket received" appears BUT check status stays ✓ → State update issue

3. **Check backend terminal for Phase 4 logs**
   - NO "markAsRead called" logs → API request not reaching backend
   - Logs appear → Backend working, issue is frontend socket

4. **Check Network tab (F12 → Network)**
   - Filter for "/read" requests
   - Should see POST `/chats/[chatId]/messages/[messageId]/read` with status 200
   - If no request appears → API call not being made
   - If status is not 200 → Backend returned error

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| No Phase 2 logs | `markVisibleMessagesAsRead()` not called | Check if messages state is updating |
| "Socket not connected" in Phase 2 | Socket disconnected | Check socket connection status |
| Phase 2 logs appear but no Phase 3 | API call successful but broadcast failed | Check backend logs |
| Phase 3 logs but check stays ✓ | Socket event received but state not updating | Check setMessages state update |

## Manual Testing (if logs aren't clear)

1. **In browser console**, manually mark message as read:
```javascript
// Find the chatId from the chat page
const chatId = 'your-chat-id';
const messageId = 'your-message-id';

// Make API call directly
fetch(`${API_URL}/chats/${chatId}/messages/${messageId}/read`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
}).then(r => r.json()).then(console.log);
```

2. **Check backend logs** for the response

3. **Check if socket receives the broadcast**:
```javascript
// In browser console
socket.on('message_read', (data) => {
  console.log('🎯 Raw socket event received:', data);
});
```

## Files Involved

**Backend:**
- `backend/src/controllers/chatController.js` - `markAsRead()` function (line 491)
- `backend/src/routes/chatRoutes.js` - Route definition (line 23)
- `backend/src/server.js` - Socket.io setup (line 58)

**Frontend:**
- `web/src/pages/ChatPage.jsx` - Socket listener (line 176), markVisibleMessagesAsRead (line 35)
- `web/src/services/chatService.js` - API call (line 72)

## Quick Reset

If you want to reset read receipts for testing:

```bash
# Backend: Delete all read receipts
# Run in Prisma shell or make an endpoint to clear them

prisma.messageRead.deleteMany({})
```

Then reload the chat and try again.
