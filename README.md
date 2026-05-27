# WorkHub Assistant

A mobile-first web app for small business owners using GoHighLevel. Built with React, Vite, and Tailwind CSS.

## Features

- 💬 **Chat** — Full-screen AI assistant chat with message history
- 📸 **Upload** — Drag-and-drop photo upload with thumbnail preview
- 📊 **Activity** — Dashboard of recent actions and connected services

## Tech Stack

- React 19 + Vite 8
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- React Router v7

## Getting Started

```bash
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `VITE_GHL_API_KEY` | GoHighLevel API key |
| `VITE_GHL_LOCATION_ID` | GoHighLevel Location/Sub-account ID |

## Project Structure

```
src/
├── components/
│   ├── BottomNav.jsx       # Bottom tab navigation
│   └── RobotAvatar.jsx     # AI assistant avatar SVG
├── screens/
│   ├── ChatScreen.jsx      # Chat UI with message bubbles
│   ├── UploadScreen.jsx    # Photo upload & preview
│   └── DashboardScreen.jsx # Activity feed & status
├── App.jsx                 # Router setup
├── main.jsx                # Entry point
└── index.css               # Global styles + Tailwind import
```
