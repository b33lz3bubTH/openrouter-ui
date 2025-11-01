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
- [x] fixed "Cannot access 'toast' before initialization" error in ChatLayout.tsx by removing toast from useCallback dependency arrays since it's a stable reference
- [x] fixed summarization logic to properly wait for 5 messages before generating summary, and retry on every message after failure until success (created dedicated summaryState table for global state tracking, updated database version to 9)
- [x] for both desktop and for mobile the chat area css looks awful, its not dynamic for long messages, like it should grow with message length but it will grow to some extend, similar to whatsapp. the ui needs to be similar to chat apps, fb , instagram, tiktok and whatsapp and telegram, then and then only it will be good.


## high priority tasks
- [ ] test the summarization logic to ensure it waits for 5 messages, retries on failure, and maintains persistent state across app restarts
  - Test normal flow: messages 1-5 (no summary), message 5 (summary generated)
  - Test retry flow: if summary fails at message 5, should retry at messages 6, 7, 8, 9, 10... until success
  - Test recovery: once successful (say at message 7), should wait for next 5 messages (messages 8-12), then generate at message 12
  - Test persistence: restart app, state should be maintained
  - Test migration: existing threads should get proper default values for new fields


## pending tasks
- [ ]


## feture work tasks
- [ ]

## completed
- [x] run a scheduler, after every 5 successful messages, call a function for now make it as a place holder function, that has access to
        all current thread messages, all recent successful response messages and roleplay rules, as well as maintain a state for summerization.
        so the idea goes such as, after every 5 messages a new summary will be added. what the user is talking about, with a default generic summary prompt, i want to send (roleplay rules + [5 recent messages with bot] + previous summary), what every the summary results are
        it will be push as new context summary, and with roleplay the previous 5 summary will go, and current chat summary will go, plus the current flow will also go, that is recent messages.
- [x] create a separate class using good coding principals, so that this is managed by using SOLID principals, and use this class to intregrate in the current flow.
- [x] make sure the media messages are ignored while building the summary for current context, and with each llm message a current chat summary will go, so that the llm gets a better context
- [x] assume things better, consider edge cases
- [x] optimize useChat hook to reduce unnecessary re-renders by using useMemo for derived state and useCallback for stable references
- [x] optimize ChatArea component by memoizing message rendering, reducing useEffect dependencies, and preventing unnecessary media loading
- [x] optimize ChatLayout component by memoizing expensive computations and reducing state updates
- [x] add React.memo to message components and other UI elements to prevent unnecessary re-renders
- [x] add smooth animations and transitions for better UX as mentioned in guidelines
- [x] there is already an older version of this app is running, if these are merged, then next chat summary will be generated. make sure that does happen and there wont be any errors.