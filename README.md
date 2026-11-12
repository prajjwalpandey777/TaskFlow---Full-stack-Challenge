# TASKFLOW – Smart Task Manager

TASKFLOW is a task management web app built with HTML, CSS, vanilla JavaScript, Node.js, Express, and SQLite. It supports creating, editing, searching, filtering, sorting, completing, and deleting tasks.

## Live Demo

Replace the example URL below with your Vercel deployment URL:

[Open TASKFLOW](https://your-project-name.vercel.app)

## Features

- Create, edit, complete, reopen, and delete tasks
- Search task titles, descriptions, and categories
- Filter by status and priority; sort by date or priority
- Dashboard statistics for total, completed, pending, and overdue tasks
- Responsive layout, dark/light theme, and browser-saved theme preference
- Express REST API with server-side validation and JSON error responses

## Tech Stack

- Frontend: HTML5, CSS3, vanilla JavaScript
- Backend: Node.js and Express
- Storage: SQLite using `better-sqlite3`
- Communication: REST API, JSON, and Fetch API

## Project Structure

```text
taskflow/
├── backend/
│   ├── api.js
│   ├── server.js
│   ├── controllers/
│   │   └── taskController.js
│   ├── database/
│   │   └── db.js
│   ├── middleware/
│   │   └── errorHandler.js
│   └── routes/
│       ├── statsRoutes.js
│       └── taskRoutes.js
├── frontend/
│   ├── index.html
│   ├── script.js
│   └── style.css
├── package.json
├── vercel.json
└── README.md
```

## Run Locally

Requires Node.js 22 or newer.

```bash
npm install
npm start
```

Open <http://localhost:3000>. SQLite creates `backend/database/taskflow.db` automatically when the backend starts. The database file is ignored by Git; back it up separately if you need to preserve local tasks.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Check backend status |
| GET | `/api/tasks` | List tasks; supports `search`, `status`, `priority`, and `sort` query parameters |
| GET | `/api/tasks/:id` | Retrieve one task |
| POST | `/api/tasks` | Create a task; `title` is required |
| PUT | `/api/tasks/:id` | Update task fields |
| PATCH | `/api/tasks/:id/complete` | Mark a task complete |
| PATCH | `/api/tasks/:id/incomplete` | Reopen a task |
| DELETE | `/api/tasks/:id` | Delete a task |
| GET | `/api/stats` | Get dashboard statistics |

Example health check:

```bash
curl http://localhost:3000/api/health
```

## Deploy to Vercel

1. Push the project files to a GitHub repository. Keep `vercel.json` at the repository root, alongside `package.json`.
2. In Vercel, choose **Add New → Project** and import the repository.
3. If the repository contains a parent folder, set Vercel’s **Root Directory** to the `taskflow` folder that contains `vercel.json` and `package.json`.
4. Keep the build configuration from `vercel.json`, then deploy.
5. Test `https://your-project-name.vercel.app/api/health` and open the deployed app.

### Vercel Storage Limitation

On Vercel, this project stores SQLite at `/tmp/taskflow.db`. Vercel’s temporary filesystem is not durable: tasks may be lost when a function instance is replaced or restarted. Vercel also seeds a few sample tasks when a new temporary database is created. This deployment is suitable for a demo, not for persistent task storage.

## User Data

This version does not authenticate users or separate tasks by browser ID. Tasks in a running SQLite database are shared by requests handled by that instance. Do not use it for sensitive data or treat it as a secure multi-user application.
