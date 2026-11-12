# TASKFLOW

TASKFLOW is a task manager with a vanilla JavaScript frontend, an Express REST API, and Neon PostgreSQL storage.

## Project structure

```text
taskflow/
├── backend/
│   ├── controllers/       API request handlers and validation
│   ├── database/schema.sql PostgreSQL table and index definition
│   ├── middleware/        User ID validation and error handling
│   ├── routes/            Task and statistics endpoints
│   ├── services/          PostgreSQL storage module
│   └── server.js          Express app
├── frontend/              Original frontend source files
├── public/                Static frontend assets served by Vercel
├── index.js               Vercel Express entry point
├── package.json
└── README.md
```

Keep `index.js`, `package.json`, `backend/`, and `public/` in the Vercel project root. `public/` serves the live website; Express handles the API. Keep `frontend/` if you want the original editable source in the repository. If you edit the frontend, copy the updated `index.html`, `style.css`, and `script.js` into `public/` too.

## Requirements

- Node.js 22 or newer
- A Neon PostgreSQL database

## Set up the database

The backend creates the `tasks` table and index if they do not exist. You can also create them manually:

1. Open the Neon project’s **SQL Editor**.
2. Run the SQL in `backend/database/schema.sql`.

The `tasks` table stores `id`, `user_id`, `title`, `description`, `priority`, `category`, `due_date`, `completed`, `created_at`, and `updated_at`.

## Run locally

In PowerShell, set your Neon pooled connection URL, then install and start the app:

```powershell
$env:POSTGRES_URL = 'your-Neon-pooled-connection-string'
npm install
npm start
```

Open <http://localhost:3000>. Do not commit the connection string or place it in frontend code.

## Deploy to Vercel

1. Push the project to GitHub and import that repository in Vercel.
2. Set Vercel’s **Root Directory** to the folder containing `index.js` and `package.json`.
3. Connect the Neon integration to the Vercel project for Production (and Preview if needed).
4. Use Neon’s pooled `POSTGRES_URL` for serverless requests. Do not use `POSTGRES_URL_NON_POOLING`.
5. Redeploy after connecting the database or changing environment variables.
6. Verify `https://YOUR-PROJECT.vercel.app/api/health` returns JSON with `"status":"ok"`.
7. Open the app and create a task. Confirm it appears in Neon’s **Data Editor → tasks**.

If the frontend loads but shows `Request failed (404)`, confirm the Vercel Root Directory contains `index.js`, `package.json`, `backend/`, and `public/`. The database URL does not fix a missing API route.

## API

All endpoints except health require a valid UUID in the `X-User-ID` header. The frontend creates and stores this UUID in browser localStorage.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Backend status |
| GET | `/api/tasks` | List the current user's tasks; supports `search`, `status`, `priority`, and `sort` |
| GET | `/api/tasks/:id` | Get one task belonging to the current user |
| POST | `/api/tasks` | Create a task |
| PUT | `/api/tasks/:id` | Update a task |
| PATCH | `/api/tasks/:id/complete` | Complete a task |
| PATCH | `/api/tasks/:id/incomplete` | Reopen a task |
| DELETE | `/api/tasks/:id` | Delete a task |
| GET | `/api/stats` | Current user's dashboard statistics |

## User ID limitation

The browser UUID provides lightweight device-level separation, not authentication. A person who can copy or set another user's UUID can access that user's tasks. Do not treat this as secure authentication for sensitive data.
