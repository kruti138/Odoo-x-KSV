# VendorBridge

A full-stack procurement and vendor management ERP built with MongoDB, Express,
React, Node.js, and Vite.

## Quick start

```powershell
npm run install:all
npm install
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:5000`.

The backend runs with seeded in-memory demo data by default. To use MongoDB,
copy `backend/.env.example` to `backend/.env`, set `MONGO_URI`, and set
`USE_MEMORY_DB=false`.

The app no longer ships with hardcoded demo user accounts. Create a new
account through the signup flow to access the system.

