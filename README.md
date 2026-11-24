# UAB/COA Weekend Attending Scheduler — 2027

Attendings sign in with their UAB email (no password), say how many weekends
they want, and rank weekends in order of preference. The admin then runs a fair
allocation and downloads the group's Word document.

## Try it without Firebase

Add `?demo` to the address (e.g. `http://localhost:5173/?demo`). In preview mode
you pick a name instead of signing in, data stays in your browser only, and the
Admin Panel has a **Fill with random test data** button so you can try the
allocation and the Word export end to end.

## How the allocation works

1. **Numbers.** Everyone who asked for a specific number gets it. What is left
   (of 100 slots: 50 weekends × RNI/COA; Christmas and New Year are not counted)
   is split equally among the "as many as possible" group. If it does not divide
   evenly, the scheduler gets one of the extra weekends and a lottery picks the
   rest. If specific requests add up to more than 100, everyone is capped evenly.
2. **On-service priority.** In each month, RNI weekends go first to that month's
   RNICU Resident and NNP/BPD attendings, and COA weekends to the QB and Harbert
   attendings, for every weekend of that month they ranked (up to their number).
   Split-month attendings get priority for any weekend that month.
3. **Everyone else.** One weekend at a time, to whoever has received the
   smallest share of their number so far, taking their highest-ranked open
   weekend. Paid holiday weekends are spread: nobody gets a second while someone
   who ranked one has fewer.
4. **Leftovers** go to the scheduler (optionally to people still short first).

Ties are always settled by a seeded lottery — never by who submitted first —
and the same seed always reproduces the same schedule.

## Changing things for next year

Everything year-specific is in **`src/config.js`**: `YEAR`, the attendings and
their emails, the weekend list and holidays, the Christmas/New Year blocks, and
who is on service each month. Update the email list in `firestore.rules` too.

## One-time Firebase setup (about 5 minutes)

In the [Firebase console](https://console.firebase.google.com), open the project
(currently `attending-schedule-2026`):

1. **Authentication → Sign-in method → Add new provider → Email/Password.**
   Turn on **Email link (passwordless sign-in)** and save.
2. **Authentication → Settings → Authorized domains → Add domain:** add the
   web address where the app is hosted (for example `your-app.vercel.app` or
   `yourname.github.io`).
3. **Firestore Database → Rules:** paste the contents of `firestore.rules` and
   click **Publish**. Only the 18 listed emails can sign in; each person can
   only see their own preferences; only the admin can see everyone's.
4. Send yourself a sign-in link first to make sure UAB email delivers it (check
   Junk/Quarantine). If it is quarantined, ask UAB IT to allow
   `noreply@attending-schedule-2026.firebaseapp.com`.

## Developing

```bash
npm install
npm run dev      # local development
npm test         # allocation engine tests
npm run build    # production build in dist/
```

## Files

- `src/App.jsx` — the app (screens and admin panel)
- `src/config.js` — all 2027 settings
- `src/allocate.js` — allocation engine (no UI; fully tested)
- `src/wordExport.js` — builds the Word document
- `src/store.js` — sign-in and database (Firebase, or preview mode)
- `firestore.rules` — database security rules
- `tests/allocate.test.js` — tests for the allocation rules
