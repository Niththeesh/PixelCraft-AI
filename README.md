# My Web App (Aetheria Full-Stack Framework)

A modern full-stack web application featuring an Express.js server backend and a dynamic dark-glassmorphism responsive web frontend interface.

## 📁 Directory Structure

```
my-web-app
│
├── public
│   ├── index.html       # Single Page Application HTML markup
│   ├── css
│   │   └── style.css    # Dark glassmorphism CSS design system
│   ├── js
│   │   └── app.js       # Client app logic, API fetching & animations
│   └── assets           # Static media assets
│
├── server
│   ├── server.js        # Express HTTP server entry point
│   ├── routes           # API router definitions (/api/v1)
│   ├── controllers      # Route handler controllers logic
│   ├── services         # Data management & business logic layer
│   └── config           # Environment configuration loader
│
├── .env                 # Environment variables
├── .gitignore           # Git ignore patterns
├── package.json         # NPM manifest & dependencies
└── README.md            # Project documentation
```

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
# or for development mode with auto-reload:
npm run dev
```

### 3. Open in Browser
Visit `http://localhost:3000` to interact with the application.

## 🔌 API Endpoints (`/api/v1`)

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/health` | GET | System status & uptime check |
| `/api/v1/stats` | GET | Dynamic server metrics (CPU, Memory, Requests, Latency) |
| `/api/v1/data` | GET/POST | Dataset items retrieval and creation |
| `/api/v1/search` | GET | Query search filter across items dataset |
| `/api/v1/messages` | POST | Process feedback/contact form submissions |

## ✨ Features
- **Express.js API Architecture**: Clean separation of routes, controllers, services, and configs.
- **Glassmorphism Dark UI**: Modern dark theme with CSS blur backdrop filters, glowing badges, and dynamic card layouts.
- **Real-Time System Metrics**: Interactive dashboard updating server stats live via REST API.
- **Interactive API Tester**: In-browser API console tool for testing backend endpoints live.
- **Responsive Layout**: Designed for mobile, tablet, and desktop viewports.
