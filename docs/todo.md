## basic coding practices guidelines
- use solid principals
- use design principals
- use state manager for all data storing operations, if the data is persisted then use redux toolkit
- this is both mobile and desktop app, so the mobile version has to mimic similar to whatsapp
- after every code iterations update the todo, to check mark what is done, add new tasks based on the task tracker status
- run linter update fixes
- fix issues then update the todo and run again the cycle of coding, when everything is done put it inside the complete tracker
- make sure this frontend app is following all the best practices




## in progress

### Message Queue and UI Display Architecture Fix

**Problems Identified:**
1. Message concatenation at debounce level: Messages in the batch are being joined with `\n` and sent as a single concatenated message instead of remaining separate individual entities
2. UI not reflecting queued messages: Optimistic messages added to queue are not properly displayed in DOM/UI due to incorrect thread matching logic
3. State synchronization issues: Message state updates after batch flush don't properly mark messages as delivered or update content

**Architecture Changes:**

1. **Fix Message Batching Flush Callback** (`src/hooks/useChat.ts`)
   - Replace message concatenation (`messages.join('\n')`) with individual message processing
   - Create separate `batched_text` events for each message in the batch
   - Process each message individually when batch flushes
   - Mark each optimistic message as delivered with correct content individually

2. **Fix Optimistic Message Display** (`src/store/chatPaginationSlice.ts`)
   - Fix `addOptimisticMessage` reducer to use proper `threadId` field matching instead of `message.id.split('-')[0]`
   - Add `threadId` field to `ReduxMessage` interface
   - Fix `updateMessageContent` reducer to properly update `isDelivered` status
   - Ensure messages are added to `displayedMessages` with correct thread matching

3. **Fix Message Flow Architecture** (`src/hooks/useChat.ts`, `src/store/chatEventSlice.ts`)
   - Pass optimistic message IDs through batched events to prevent duplicates
   - Reuse optimistic message IDs in `processChatEvent` for `batched_text` events
   - Ensure each message maintains individual identity throughout the flow
   - Update message states individually (isDelivered, content, isLoading)

4. **Verify ChatArea Integration** (`src/components/chat/ChatArea.tsx`)
   - Ensure ChatArea properly reads from `displayedMessages` in Redux
   - Verify optimistic messages with `isDelivered: false` are displayed correctly
   - Confirm individual messages render properly, not concatenated ones

**Implementation Status:**
- [x] Fixed flush callback to process messages individually
- [x] Fixed optimistic message reducer with proper threadId matching
- [x] Updated message state management for individual updates
- [x] Verified UI display of queued messages
- [x] Ensured message ID reuse to prevent duplicates

## in progress fixes (current requiremnts of in progress will generate some errors, those will come here) these are related to in progress tasks
- []

## high priority tasks
- [ ] test the summarization logic to ensure it waits for 5 messages, retries on failure, and maintains persistent state across app restarts
  - Test normal flow: messages 1-5 (no summary), message 5 (summary generated)
  - Test retry flow: if summary fails at message 5, should retry at messages 6, 7, 8, 9, 10... until success
  - Test recovery: once successful (say at message 7), should wait for next 5 messages (messages 8-12), then generate at message 12
  - Test persistence: restart app, state should be maintained
  - Test migration: existing threads should get proper default values for new fields


## pending tasks




## feture work tasks
- [ ]

## completed
- [x] Fixed message ordering issue after refresh - completely rewrote message loading and sorting logic:
  - Fixed `fixMessageSequences` to remove duplicates and properly assign sequential numbers based on timestamp and role (user before assistant)
  - Fixed `getRecentMessages` to remove duplicates, sort by sequence ascending, and return messages in correct order
  - Fixed `getOlderMessages` to remove duplicates and maintain proper ordering
  - Fixed `loadInitialMessages` to deduplicate messages and ensure proper sorting before setting Redux state
  - Fixed `loadMoreMessages` to deduplicate when merging with existing messages and maintain proper ordering
  - All message retrieval now ensures: sequence asc → role (user before assistant) → timestamp asc → id for stable ordering 