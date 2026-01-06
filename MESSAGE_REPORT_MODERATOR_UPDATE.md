# Message Report Feature - Moderator Update

## Summary

Updated the message reporting system to allow moderators to view and delete reported messages from their moderation dashboard.

## Changes Made

### 1. Database Schema Update

**File:** `backend/prisma/schema.prisma`

- Added `reportedMessageId String? @db.Uuid` field to Report model
- Added index on `reportedMessageId` for query performance

**Migration Required:**

```bash
cd backend
npx prisma migrate dev --name add_reported_message_id
# Or on production:
npx prisma db push
```

### 2. Backend - Report Controller

**File:** `backend/src/controllers/reportController.js`

- Updated validation to accept `reportedMessageId` in report creation
- Modified duplicate check to include message ID
- Updated error message to mention all three report types

### 3. Frontend - Chat Reporting

**File:** `web/src/pages/ChatPage.jsx`

- Updated `handleReportMessage` to include:
  - `reportedMessageId: message.id`
  - Chat ID in description for moderator reference
  - Format: `"Reported message\nChat ID: {chatId}\nMessage ID: {messageId}\nText: {...}"`

### 4. Frontend - Moderation Dashboard

**File:** `web/src/pages/Moderation.jsx`

**Display Updates:**

- Added "Message ID: {id}" display for message reports
- Shows alongside User and Post ID fields

**New Actions:**

- Added `deleteReportedMessage()` function
  - Extracts Chat ID from report description
  - Calls DELETE `/api/chats/:chatId/messages/:messageId` endpoint
  - Auto-resolves the report after successful deletion
  - Shows confirmation before deleting

**UI Updates:**

- Added "Delete Message" button for pending message reports
- Button only shows when `reportedMessageId` exists
- Red background to indicate destructive action

## How It Works

### User Reports Message

1. User clicks report (⋮) menu on a message
2. Report sent with:
   - `reason: "harassment"`
   - `reportedUserId`: Message sender ID
   - `reportedMessageId`: Message ID
   - `description`: Includes Chat ID and message text

### Moderator Reviews Report

1. Moderator goes to Moderation page → Reports tab
2. Sees report with:
   - Reason and description
   - User info (sender)
   - **Message ID** (new)
   - Message text preview in description

### Moderator Takes Action

**Option 1: Delete Message**

- Click "Delete Message" button
- Confirms deletion
- Message removed from chat
- Report auto-resolved
- All chat participants see message disappear

**Option 2: Resolve/Dismiss**

- Click "Resolve" if issue handled externally
- Click "Dismiss" if report is invalid
- Report moves to respective status

## Testing Steps

1. **Test Reporting:**

   - Login as user A
   - Send a message in any chat
   - Login as user B
   - Report the message
   - Check report includes Chat ID in description

2. **Test Moderation:**

   - Login as admin/moderator
   - Go to Moderation → Reports → Pending
   - Verify Message ID is displayed
   - Click "Delete Message"
   - Confirm deletion
   - Verify message removed from chat
   - Verify report marked as resolved

3. **Test Socket Updates:**
   - Have chat open in another window
   - Delete reported message as moderator
   - Verify message disappears in real-time

## Deployment Notes

### Backend

1. Push schema changes to repository
2. On production server:
   ```bash
   cd backend
   npx prisma db push
   # or if using migrations:
   npx prisma migrate deploy
   ```
3. Restart backend server

### Frontend

- Changes are code-only, no env vars needed
- Deploy normally

## Future Enhancements

- [ ] Add "View in Chat" button to jump to chat context
- [ ] Show full message thread for context
- [ ] Batch actions for multiple reports
- [ ] Filter reports by type (user/post/message)
- [ ] Add message sender ban option
- [ ] Show message timestamp and chat name
