# Flashcard Study App

A simple React + Firebase flashcard app with chapter-based study rounds and analytics.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
3. Fill in your Firebase config values.
4. Start the dev server:
   ```bash
   npm run dev
   ```

## Firebase CLI (RTDB + Auth)

- Set the Firebase project (once): `firebase use --add` (or edit `.firebaserc` with your project ID).
- Deploy RTDB rules: `firebase deploy --only database` (add `--project <id>` if no default).
- Local emulators (Auth + RTDB): `firebase emulators:start --only auth,database`.
- Enable Email/Password in Firebase Auth in the console before signing in.

## Data paths used

- Chapters: `/chapters`
- Terms: `/terms`
- Scores: `/users/{uid}/scores/{chapter_number}/{timestamp_key}`

All reads/writes use the signed-in user UID for `/users/{uid}` data.

## Scoring + persistence

At the end of each round, the app writes a score record with:

- Required legacy fields: `chapter`, `correct`, `incorrect`, `date`, `C_DateScore`, `I_DateScore`, `__scopeVariableInfo`.
- New fields: `duration_ms`, `total`, `accuracy`.

`timestamp_key` is `Math.floor(Date.now() / 1000)` and `date` stores epoch seconds with decimals.
`C_DateScore` and `I_DateScore` use the `YYYY-MM-DD` format.

## Analytics computation

The analytics view:

- Normalizes history records into an array sorted by `date` (fallback to timestamp key).
- Computes `total` and `accuracy` when missing.
- Calculates summary stats (last round, best accuracy, best time, rolling 5-round average).
- Supports range filters (all, 30 days, 7 days) client-side.

## Firebase Realtime Database rules

The app includes an example `database.rules.json` allowing:

- Public read of `/chapters` and `/terms`.
- Authenticated read/write for `/users/{uid}` only when the UID matches.
- Everything else denied.

## Assumptions

- If a chapter has no terms, the study screen shows a friendly empty state.
- Duration charts only render data when the `duration_ms` field exists (older records will show gaps).
