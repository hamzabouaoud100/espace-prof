# Espace Prof · فضاء الأستاذ

An Arabic and French workspace with four main sections — Dashboard, Student lists, Attendance, and Continuous assessment. It includes weekly lessons, class lists, attendance, two semesters of marks and comments, Excel imports/exports, and Word attendance reports.

## Run locally

Double-click **Open-Website.cmd**, or run `npm start` and open `http://127.0.0.1:4173/`.
Use the teacher account configured in the server. Opening an HTML file directly redirects to the local login server.

The server checks credentials and protects the dashboard using an HttpOnly session cookie. Sessions expire after eight hours and reset when the server restarts. Class data is currently stored in the browser’s local storage, so use the same browser and address to access existing data.

## Source layout

- `server.cjs`: local HTTP server, login, sessions, protected assets, and logout.
- `dist/state.js`: shared state, persistence, navigation labels, and small helpers.
- `dist/app.js`: dashboard views and classroom interactions.
- `dist/ui.js`: consistent icons, translated shell, and logout action.
- `dist/schedule.js`: weekly timetable data and one-time import.
- `dist/support.js`: support groups, class ordering, and data migrations.
- `dist/remarks.js`: manually selected teacher comments.
- `dist/semesters.js`: semester migration, separate marks, and import matching.
- `dist/files.js`: Excel import and original workbook export.
- `dist/attendance-report.js`: Arabic Word attendance reports.
- `dist/filters.js`: explicit result confirmation and filter state.
- `dist/simple.js`: simple Excel import/export with names and marks.
- `dist/confirmations.js`: attendance/marks confirmation and status.
- `dist/login.js`: login submission, language selection, and password visibility.
- `dist/style.css`: base styles, sign-in, and shared controls.
- `dist/workspace.js`: dashboard timetable, student lists, and assessment progress.
- `dist/workspace.css`: the blue teaching workspace, data panels, and responsive layouts.

## Checks

Run `npm run check` to validate JavaScript, CSS, and local asset references. Run `npm test` for the workflow regression suite in `tests/`.

Run `npm run test:auth` with `TEST_PASSWORD` set to the account password to check login, protected routes, and logout. Run `npm run test:word` to check the generated Word report using the bundled document runtime; set `DOCX_NODE_MODULES` if that runtime is stored elsewhere.

Run `npm run format` to format the source consistently. Runtime dependencies for Excel and Word load from pinned CDN versions; they require an internet connection.

## Deploy on Render

1. Connect this repository to a new Render **Blueprint** using `render.yaml`.
2. Enter `TEACHER_PASSWORD` when Render asks. Keep it in Render’s secret environment settings.
3. Render installs dependencies, validates the source, and runs `npm start`.
4. Open the HTTPS address Render provides.

The blueprint uses a free web service for preview. Data is still stored in each browser, not a shared online database. Existing local browser records are not automatically transferred to a new website address. Add a database before relying on cross-device access.

Local credentials are stored in the ignored `.local-auth.json` file. They are not included in GitHub. A fresh local checkout can instead run with `TEACHER_USERNAME` and `TEACHER_PASSWORD` supplied in its environment.
