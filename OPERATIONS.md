# NETBACK recovery studio

Open `/lab`. Test mode starts enabled and uses an in-memory fictional incident and fleet. Play/pause, single-step, reset, weather hold and recovered/partial/failed outcomes exercise the same transition rules as local operations. Test mode never writes to the operations API. Reloading resets the training exercise.

Switch Test mode off to open local operations. Enter a recorder name, register a report and vessels, review conditions, reserve an eligible vessel, record crew acceptance and departure, then enter the actual outcome and evidence review. Every report mutation checks its revision. Reservations prevent double booking. Fleet matching checks equipment, availability, depth, wave limit, radius and estimated budget. Names and confirmations are operator-entered, not authenticated.

Operational records are saved in `.netback/operations.json` on the machine running Next.js. This directory is git-ignored. Writes use an exclusive lock and atomic replacement; malformed storage is not overwritten. The API accepts local hostnames and rejects foreign origins. This is a local workspace, not an authenticated shared deployment. Do not expose the development server publicly. Production use needs authentication, authorization, managed durable storage and operational integrations.

Use Export JSON for a copy of the current records. No import or deletion UI is provided. Back up `.netback` before moving the app. If a process crashes mid-save and leaves `.netback/write.lock`, stop the server, confirm there is no writer, back up the directory and remove only the stale lock before restarting.

The scene is a stage-driven schematic, not live GPS. Vessel positions are entered base coordinates. Distance is straight-line; time is estimated round-trip distance divided by entered speed plus on-site hours. Cost is time multiplied by the declared all-in hourly rate. These are screening estimates, not navigable routes, quotes or safety certification. Contact crews outside NETBACK. No emails, dispatch requests or external messages are sent. Evidence fields save a reference string; files are not uploaded or automatically verified.

The earlier historical-data budget planner remains at `/lab/planner`. Existing walkthrough and admin pages retain their separate demonstration records; they are not synchronized with the new local operations ledger.

## Verification

`npm test` runs planner, legacy mission-state and operational transition tests.
`npm run build -- --webpack` verifies the production build.

For API QA only, start the app in an isolated copy with an empty `.netback` directory and run:

    NETBACK_QA_URL=http://127.0.0.1:4178 node tests/operations-api.test.mjs

The API test intentionally creates local QA records and requires an empty workspace. Do not run it against user records or copy QA `.netback` data into the original project.
