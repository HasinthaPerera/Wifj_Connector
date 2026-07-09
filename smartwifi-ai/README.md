# SmartWiFi AI

> AI-Powered Wi-Fi Optimizer and Network Health Assistant

SmartWiFi AI is a production-quality, cross-platform desktop application (Windows, macOS, and Linux) built with Electron, React, Vite, Tailwind CSS, and TypeScript. It helps users monitor, analyze, diagnose, and optimize their local Wi-Fi networks and internet connection quality with beautiful visuals and AI-driven insights.

---

## 🚀 Key Features

- **Dashboard**: Centralized hub presenting current connection speed, signal strength, real-time health score, and quick actions.
- **Wi-Fi Information**: Detailed scans displaying SSID, BSSID, channel number, security protocols, frequency, and link speed.
- **Network Information**: System IP address, MAC address, gateway address, DNS configurations, and active adapter statuses.
- **Internet Speed Test**: Real-time download/upload rate profiling, latency ping, and jitter metrics.
- **Ping Monitor**: Connection stability tracker with graphical telemetry and packet loss flags.
- **Signal Strength Monitor**: Historical signal quality charting to detect dead zones.
- **AI Diagnosis**: Intelligent, localized recommendation engine giving tips to improve connectivity.
- **Network Optimization**: Direct system analysis tools to repair DNS caching and routing configurations.
- **Bandwidth Monitoring**: Live network interface card (NIC) throughput logging.
- **Historical Analytics**: SQLite-backed logs tracking speed history and signal degradation charts.
- **Dark & Light Mode Support**: Smooth transition theme configurations persisting automatically.

---

## 🛠️ Technology Stack

- **Framework**: [Electron](https://www.electronjs.org/) (Multi-process Desktop App Shell)
- **Frontend Core**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Tooling**: [Vite 7](https://vite.dev/) + [Electron-Vite](https://electron-vite.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (using native `@tailwindcss/vite` plugin)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Routing**: [React Router v7](https://reactrouter.com/) (configured with `HashRouter` for Electron compliance)
- **Database**: [SQLite](https://sqlite.org/) (handled via `better-sqlite3` native drivers)
- **Formatting & Linting**: [ESLint 9](https://eslint.org/) (Flat Configurations) + [Prettier 3](https://prettier.io/)

---

## 📁 Directory Structure

The project conforms to a clean, decoupled architecture dividing the Electron application process from the web-based Renderer view:

```text
smartwifi-ai/
├── src/
│   ├── main/                    # Electron Main Process (Node.js/Native layer)
│   │   └── index.ts
│   ├── preload/                 # Electron Preload script (Secure IPC Context Bridge)
│   │   ├── index.ts
│   │   └── index.d.ts
│   └── renderer/                # React Webapp Renderer Process (Frontend layer)
│       ├── index.html
│       └── src/
│           ├── assets/          # Global styles, fonts, and assets
│           ├── components/      # Reusable React components
│           │   └── ui/          # Generic visual UI primitives (Buttons, Cards, Badges)
│           ├── context/         # React context providers (Theme, Settings)
│           ├── hooks/           # Custom reusable React hooks
│           ├── layouts/         # Frame wrappers (Root layout frame, Nav Bar sidebar)
│           ├── pages/           # Route-level page files (Dashboard, Settings, SpeedTest)
│           ├── services/        # IPC bridges, APIs, database connector modules
│           ├── types/           # Global TypeScript type declaration models
│           ├── utils/           # Helper utility functions
│           ├── App.tsx          # Router layout configuration
│           └── main.tsx         # React application mounting point
├── electron.vite.config.ts      # Multi-process bundler build configurations
├── electron-builder.yml         # Native installer packaging scripts (Windows, Mac, Linux)
├── tsconfig.json                # TypeScript Project references configuration
├── tsconfig.web.json            # Renderer configuration compiler rules
├── tsconfig.node.json           # Main & Preload process compiler rules
├── eslint.config.mjs            # Flat ESLint rules configuration
└── .prettierrc.yaml             # Prettier styling layout rules
```

---

## 🔧 Developer Getting Started

### 📋 Prerequisites
- [Node.js](https://nodejs.org/) v20.11+
- [Git](https://git-scm.com/)

### 🚀 Setup Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the development server**
   ```bash
   npm run dev
   ```
   *This starts the Vite renderer server and opens the Electron desktop window in debug mode with hot reloading (HMR) enabled.*

3. **Format & Lint checks**
   ```bash
   npm run format     # Format code layout using Prettier
   npm run lint       # Scan project for rules or logic violations
   npm run typecheck  # Run strict TypeScript compiler rules check
   ```

---

## 📦 Packaging and Distribution

SmartWiFi AI uses `electron-builder` to package code into standalone native installers:

```bash
# Package standard unpackaged executables (test target builds)
npm run build:unpack

# Build Windows installer executable (.exe)
npm run build:win

# Build macOS installer package (.dmg)
npm run build:mac

# Build Linux installer package (AppImage, snap, .deb)
npm run build:linux
```
