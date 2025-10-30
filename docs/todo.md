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

## in progress fixes (current requiremnts of in progress will generate some errors, those will come here) these are related to in progress tasks
- [x] fixed "Cannot access 'toast' before initialization" error in ChatLayout.tsx by removing toast from useCallback dependency arrays since it's a stable reference


## high priority tasks
- [ ]


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