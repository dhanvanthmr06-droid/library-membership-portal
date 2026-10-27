# Library Membership Portal

A full-stack library portal built with React, Vite, JavaScript, CSS, Express, and JSON-file persistence.

## Features
- Member registration and login using JWT authentication
- Password hashing with bcrypt
- Browse and search a curated book catalogue
- Request a book and track request status
- Membership overview and member dashboard
- Admin dashboard to review requests and update request statuses
- Light/dark theme toggle
- Responsive layout for desktop and mobile
- REST API with validation and protected routes

## Requirements
- Node.js 18+ and npm

## Run locally
From the project root:

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api
- API health check: http://localhost:5000/api/health

Vite proxies `/api` requests to the Express backend.

## Demo admin account
- Email: `admin@library.local`
- Password: `Admin@123`

You can also create a normal member account through the Register page.

## Notes
- The server persists users and book requests in `server/data/db.json`.
- The catalogue is provided by the backend seed data.
- This project is intended as a development/demo starter. Before production use, add a database, rate limiting, email verification, password reset, audit logging, and stronger deployment secrets.
- Change `JWT_SECRET` in your environment for any deployment.
