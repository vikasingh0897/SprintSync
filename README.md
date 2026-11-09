# ⚡ SprintSync - Production MERN Monorepo

SprintSync is a modern, real-time Agile project management and Kanban platform built with the MERN stack (MongoDB, Express, React/Next.js, Node.js), Socket.IO WebSockets, and Nodemailer alerts.

---

## 📁 Repository Architecture

The repository is organized into two clean, self-contained folders:

```
SprintSync/                           <-- Git Repository Root
├── render.yaml                      <-- Render 1-Click Infrastructure Blueprint
├── package.json                     <-- Monorepo scripts (runs client & server together)
├── .gitignore                       <-- Comprehensive gitignore for both client & server
├── client/                          <-- Next.js 16 Production Frontend (Port 3000)
│   ├── src/                         <-- App router pages, Kanban board, components
│   ├── public/                      <-- Static assets & icons
│   ├── .env.example                 <-- Frontend environment template
│   ├── .env.local                   <-- Local environment variables (git-ignored)
│   └── package.json                 <-- Client dependencies & Next.js scripts
└── server/                          <-- Express + Socket.IO + Mongoose Backend (Port 5000)
    ├── config/                      <-- MongoDB connection with in-memory fallback
    ├── controllers/                 <-- Sprints, Employees, Tasks, Auth, Notifications
    ├── middleware/                  <-- JWT authentication middleware
    ├── models/                      <-- Mongoose Schemas (Sprint, Employee, Task, User)
    ├── routes/                      <-- REST API endpoints
    ├── services/                    <-- Nodemailer email dispatcher & data service
    ├── sockets/                     <-- Socket.IO real-time event broadcaster
    ├── .env.example                 <-- Backend environment template
    ├── .env                         <-- Local environment variables (git-ignored)
    ├── server.js                    <-- Main server entrypoint
    └── test-api.js                  <-- Automated end-to-end test suite
```

---

## 🚀 Key Features

1. **Real-Time Sprints Creation & Deletion**:
   * Create and delete sprints live on the board.
   * Changes broadcast via WebSockets (`sprint:created`, `sprint:deleted`, `sprint:updated`) to all connected team members instantly without refreshing.
2. **Real-Time Employee Setup & Email Confirmation**:
   * Admins invite team members by name, email, role, and department.
   * Nodemailer dispatches an activation email with a confirmation token.
   * Employees confirm their account, set their password at `/confirm-employee`, and are immediately logged in.
   * Real-time status shifts from **Pending Confirmation** to **Active** live across all screens.
3. **Real-Time Task Assignment Email Alerts**:
   * When a task is assigned or reassigned, Nodemailer sends an email alert containing priority badges, story points, due dates, and direct links.
   * In-app notification bell with live badge counters and real-time popover alerts.

---

## 💻 Local Development

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Start Both Frontend & Backend Concurrently
```bash
npm run dev
```
* **Frontend:** [http://localhost:3000](http://localhost:3000)
* **Backend:** [http://localhost:5000](http://localhost:5000)

### 3. Default Admin Credentials
* **Email:** `admin@admin.com`
* **Password:** `admin@1234`

---

## 🌐 1-Click Production Deployment to Render

This repository includes a [`render.yaml`](./render.yaml) blueprint file. Deploying to Render takes just a few clicks:

### Method 1: Using Render Blueprint (Recommended)
1. Push this repository to GitHub.
2. Log into [Render](https://dashboard.render.com).
3. Click **New +** and select **Blueprint**.
4. Select your **SprintSync** repository.
5. Render will automatically read `render.yaml` and configure both services:
   * **`sprintsync-api`** (Backend Web Service on Node.js)
   * **`sprintsync-frontend`** (Frontend Web Service on Next.js)
6. Add your `MONGODB_URI` environment variable (e.g. from MongoDB Atlas) when prompted.
7. Click **Apply** to deploy both services live!

### Method 2: Manual Web Service Setup on Render

#### Backend Service (`sprintsync-api`):
* **Environment:** `Node`
* **Root Directory:** `server`
* **Build Command:** `npm install`
* **Start Command:** `npm start`
* **Environment Variables:**
  * `NODE_ENV`: `production`
  * `PORT`: `10000`
  * `CLIENT_URL`: `https://<your-frontend-service-name>.onrender.com`
  * `MONGODB_URI`: `<your-mongodb-atlas-connection-string>`
  * `JWT_SECRET`: `<random-secret-key>`
  * `JWT_EXPIRE`: `7d`

#### Frontend Service (`sprintsync-frontend`):
* **Environment:** `Node`
* **Root Directory:** `client`
* **Build Command:** `npm install && npm run build`
* **Start Command:** `npm start`
* **Environment Variables:**
  * `NEXT_PUBLIC_API_URL`: `https://<your-backend-service-name>.onrender.com/api`
  * `NEXT_PUBLIC_SOCKET_URL`: `https://<your-backend-service-name>.onrender.com`

---

## 🧪 Testing

Run the automated backend test suite (tests health check, auth, real-time sprints, employee email confirmation, and task assignment alerts):
```bash
npm run server:test
```
