<div align="center">
  
# ✂️ Evenly

</div>

Evenly is a beautiful, premium platform built to let you split any expense with your friends in just a few clicks. It is a refined web app that helps you track costs in a shared group and divide them up using flexible rules like exact cuts or percentages. 

The core feature of Evenly is its **smart math engine**. It works silently to simplify messy group debts so no person has to pay multiple folks at once. With instant Google logins and a sleek, glassmorphic UI, it makes sorting out your shared finances easy, fair, and brilliant.

## ✨ Features

- **🧠 Smart Debt Simplification**: An algorithmic engine that minimizes the total number of transactions required to settle up a group. No more confusing webs of IOUs.
- **🔀 Flexible Expense Splitting**: Split bills equally, by exact custom amounts, or by percentages.
- **🤝 Shared Groups**: Easily create groups for trips, apartments, or events, and invite friends.
- **🎨 Premium 3D UI**: Features a modern, responsive glassmorphic aesthetic paired with high-performance 3D WebGL liquid-text animations and interactive elements powered by Spline.
- **🔐 Instant Authentication**: Quick and secure onboarding with Google Sign-In.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React.js (via Vite)
- **Styling**: Tailwind CSS + Custom CSS Variables + shadcn/ui
- **3D Rendering**: `@splinetool/react-spline` (Interactive WebGL assets)
- **Routing**: React Router DOM

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (managed via Supabase)
- **Client Lib**: `@supabase/supabase-js`

## 🚀 Getting Started

To run Evenly locally, you will need Node.js installed. The repository is split into two main directories: `client` and `server`.

### 1. Start the Backend Server

```bash
cd server
npm install
npm run dev
```
*(Ensure you have your `.env` file configured with your Supabase credentials and database connection string before starting).*

### 2. Start the Frontend Client

Open a new terminal window:

```bash
cd client
npm install
npm run dev
```

The app will now be running on `http://localhost:5173`.






