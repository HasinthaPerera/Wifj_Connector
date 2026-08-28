<p align="center">
  <img src="resources/icon.png" width="96" height="96" alt="SmartWiFi AI Logo" />
</p>

<h1 align="center">SmartWiFi AI</h1>

<p align="center">
  <strong>AI-Powered Wi-Fi Optimizer &amp; Network Health Assistant</strong>
</p>

<p align="center">
  <a href="#-key-features">Features</a> •
  <a href="#-technology-stack">Stack</a> •
  <a href="#-getting-started">Setup</a> •
  <a href="#-project-architecture">Architecture</a> •
  <a href="#-testing">Testing</a> •
  <a href="#-packaging--distribution">Distribution</a> •
  <a href="#-license">License</a>
</p>

---

SmartWiFi AI is a production-quality, cross-platform desktop application for **Windows**, **macOS**, and **Linux** that provides real-time wireless telemetry, intelligent diagnostics, and automated network optimization — all running 100% locally on your device with zero cloud dependencies.

Built with **Electron 39**, **React 19**, **Vite 7**, **Tailwind CSS v4**, and **TypeScript 5.9**, the application features a premium dark/light theming system with 8 accent color palettes, animated splash screen, and over 35 dedicated feature pages.

---

## 🚀 Key Features

### Network Monitoring & Analysis

| Feature | Description |
|---|---|
| **Dashboard** | Centralized hub with live connection speed, signal quality, health score gauge, and quick-action tiles |
| **Wi-Fi Info** | SSID, BSSID, channel, security protocol, frequency band, link speed, and adapter details |
| **Network Info** | IP address, MAC address, gateway, DNS servers, subnet mask, and public IP geolocation |
| **Speed Test** | Download/upload throughput profiling with ping and jitter metrics, persisted to SQLite history |
| **Ping Monitor** | Live ICMP echo latency tracking with configurable target hosts and real-time charting |
| **Jitter Monitor** | Latency variance analysis — critical for VoIP, video conferencing, and gaming |
| **Packet Loss** | Continuous packet delivery success rate monitoring with anomaly alerts |
| **Signal Strength** | Historical RSSI quality charting to identify dead zones and interference patterns |
| **Bandwidth** | Real-time NIC throughput logging with per-interface traffic visualization |
| **Latency Charts** | Time-series latency trend visualization with percentile breakdowns |

### AI Intelligence & Optimization

| Feature | Description |
|---|---|
| **Health Score** | Multi-dimensional scoring engine (signal, stability, speed, latency, security) |
| **Health Dashboard** | Comprehensive health overview combining all diagnostic dimensions |
| **AI Diagnosis** | Rule-based diagnostic engine analyzing network health and generating ranked recommendations |
| **AI Rule Engine** | Configurable condition/action rule system for automated network event responses |
| **Optimization** | DNS flush, TCP stack reset, IP lease management, and adapter configuration tools |
| **Auto Optimization** | One-click diagnostic suite that benchmarks, identifies bottlenecks, and applies safe fixes |
| **Performance Optimization** | Advanced tuning for throughput maximization and latency reduction |
| **DNS Recommendation** | Multi-provider DNS benchmark with one-click resolver configuration |

### System & Network Tools

| Feature | Description |
|---|---|
| **DNS Flush** | Clear OS-level DNS cache to resolve stale entry issues |
| **Renew IP** | Force DHCP lease renewal for fresh IP assignment |
| **Release IP** | Release current DHCP lease for adapter recycling |
| **Network Reset** | Full TCP/IP stack reset to factory defaults (admin required) |
| **Wi-Fi Reconnect** | Programmatic adapter disassociation and reconnection |
| **Process Scanner** | Identify running processes with active network connections by category |
| **Resource Monitor** | Real-time CPU, memory, disk, and network utilization tracking |
| **Heavy Usage Detection** | Flag bandwidth-intensive applications consuming network resources |

### Alerts, Analytics & Logging

| Feature | Description |
|---|---|
| **Network Alerts** | Configurable alert rules for signal drops, packet loss, and connectivity events |
| **Notification Center** | Centralized feed of all system alerts with read/unread state management |
| **History** | SQLite-backed historical log of speed tests, diagnostics, and network events |
| **Reports** | Exportable analytics summaries with trend analysis |
| **System Logs** | Timestamped operational log viewer with severity filtering |
| **Debug Console** | Developer-facing diagnostic terminal for advanced troubleshooting |

### Application & Preferences

| Feature | Description |
|---|---|
| **Settings** | System alerts, auto-refresh behavior, monitoring intervals, and data retention |
| **User Preferences** | Personalized configuration for monitoring targets and thresholds |
| **Auto Refresh Settings** | Per-page configurable polling intervals for telemetry data |
| **Theme Preferences** | Light/Dark/System mode toggle with 8 accent color palettes (Indigo, Violet, Sky, Emerald, Rose, Amber, Cyan, Fuchsia) |
| **About** | Version info, stack specifications, update checker, and MIT license viewer |
| **Help Center** | Searchable FAQ, quick-start guides, keyboard shortcuts, and support links |
| **Splash Screen** | Animated native frameless branding window during application initialization |

---

## 🛠️ Technology Stack

| Layer | Technology | Version |
|---|---|---|
| **Desktop Shell** | [Electron](https://www.electronjs.org/) | 39.x |
| **Frontend Framework** | [React](https://react.dev/) | 19.x |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | 5.9 |
| **Bundler** | [Vite](https://vite.dev/) + [electron-vite](https://electron-vite.org/) | 7.x / 5.x |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) (native `@tailwindcss/vite`) | 4.x |
| **Icons** | [Lucide React](https://lucide.dev/) | 1.x |
| **Routing** | [React Router](https://reactrouter.com/) (`HashRouter`) | 7.x |
| **Charts** | [Chart.js](https://www.chartjs.org/) + [react-chartjs-2](https://react-chartjs-2.js.org/) | 4.x / 5.x |
| **Database** | [SQLite 3](https://sqlite.org/) (WAL journal mode, on-device only) | 6.x |
| **Linting** | [ESLint](https://eslint.org/) (Flat Config) + [Prettier](https://prettier.io/) | 9.x / 3.x |
| **Testing** | [Vitest](https://vitest.dev/) | 3.x |
| **Packaging** | [electron-builder](https://www.electron.build/) | 26.x |

---

## 🔧 Getting Started

### Prerequisites

- **Node.js** v20.11 or later — [Download](https://nodejs.org/)
- **Git** — [Download](https://git-scm.com/)
- **Python 3.x** and C++ build tools (required by `sqlite3` native module)
  - **Windows**: `npm install -g windows-build-tools` or install Visual Studio Build Tools
  - **macOS**: `xcode-select --install`
  - **Linux**: `sudo apt install build-essential python3`

### Installation

```bash
# Clone the repository
git clone https://github.com/HasinthaPerera/Wifj_Connector.git
cd Wifj_Connector/smartwifi-ai

# Install dependencies (includes native module compilation)
npm install
```

### Development

```bash
# Start the Electron app with Vite HMR (hot module replacement)
npm run dev
```

This launches the Vite dev server for the renderer process and opens the Electron window with full hot-reload support. Changes to React components reflect instantly without restarting.

### Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Typecheck + production build to `out/` |
| `npm run start` | Preview the production build in Electron |
| `npm run test` | Run all Vitest test suites |
| `npm run test:watch` | Run tests in watch mode |
| `npm run typecheck` | TypeScript strict compilation check (main + renderer) |
| `npm run lint` | ESLint code quality scan |
| `npm run lint:fix` | Auto-fix ESLint violations |
| `npm run format` | Format all files with Prettier |

---

## 📁 Project Architecture

The application follows a clean, three-process Electron architecture with strict separation of concerns:

```
smartwifi-ai/
├── src/
│   ├── main/                           # Electron Main Process (Node.js)
│   │   ├── index.ts                    #   App lifecycle, BrowserWindow, splash screen, IPC handlers
│   │   ├── wifi.ts                     #   Wi-Fi adapter detection, SSID scanning, reconnect logic
│   │   ├── network.ts                  #   Network config parsing, DNS servers, public IP lookup
│   │   ├── optimization.ts             #   DNS flush/benchmark, TCP reset, IP lease, auto-optimize suite
│   │   ├── processes.ts                #   Process scanner, network connection enumeration
│   │   ├── resources.ts                #   CPU, memory, disk, and NIC throughput snapshot collection
│   │   ├── db.ts                       #   SQLite database init, speed test CRUD, WAL journaling
│   │   └── __tests__/                  #   Integration test suites (126 tests across 5 files)
│   │       ├── wifi.integration.test.ts
│   │       ├── network.integration.test.ts
│   │       ├── optimization.integration.test.ts
│   │       ├── processes.integration.test.ts
│   │       └── resources.integration.test.ts
│   │
│   ├── preload/                        # Electron Preload (Secure Context Bridge)
│   │   ├── index.ts                    #   IPC channel exposure via contextBridge.exposeInMainWorld
│   │   └── index.d.ts                  #   TypeScript declarations for window.api
│   │
│   └── renderer/                       # React Renderer Process (Frontend)
│       ├── index.html                  #   HTML entry with favicon and meta tags
│       ├── public/                     #   Static assets (favicon.png)
│       └── src/
│           ├── main.tsx                #   React mount point with provider composition
│           ├── App.tsx                 #   HashRouter integration
│           ├── assets/                 #   Global CSS (main.css with Tailwind + HSL theme system)
│           ├── components/ui/          #   13 reusable UI primitives (Button, Card, Badge, Modal, etc.)
│           ├── context/                #   5 React context providers
│           │   ├── ThemeContext         #     Light/Dark/System mode + 8 accent palettes
│           │   ├── WifiContext          #     Global Wi-Fi status polling (4s interval)
│           │   ├── NotificationContext  #     Real-time adapter event notifications
│           │   ├── PreferencesContext   #     User preference persistence
│           │   └── ToastContext         #     Floating notification toast system
│           ├── hooks/                  #   Custom React hooks (useBreakpoint, etc.)
│           ├── layouts/                #   RootLayout with responsive sidebar + TopBar
│           ├── pages/                  #   39 route-level page components
│           ├── router/                 #   Route definitions with React.lazy code splitting
│           ├── services/               #   IPC bridge modules
│           ├── lib/                    #   Shared library utilities
│           ├── types/                  #   TypeScript type definitions
│           └── utils/                  #   Helper functions with unit tests
│
├── resources/                          # App icon source files
├── build/                              # electron-builder icon assets (ico, icns, png)
├── electron.vite.config.ts             # Multi-process Vite build config with manual chunks
├── electron-builder.yml                # Installer packaging config (NSIS, DMG, AppImage/DEB)
├── tsconfig.json                       # TypeScript project references
├── tsconfig.node.json                  # Main + preload compiler config
├── tsconfig.web.json                   # Renderer compiler config
├── eslint.config.mjs                   # ESLint 9 flat config
└── .prettierrc.yaml                    # Prettier formatting rules
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Electron Shell                           │
│                                                                 │
│  ┌──────────────────────┐    IPC     ┌────────────────────────┐ │
│  │    Main Process      │◄──────────►│   Renderer Process     │ │
│  │                      │  (secure   │                        │ │
│  │  • wifi.ts           │  context   │  • React 19 + Router 7 │ │
│  │  • network.ts        │  bridge)   │  • Tailwind CSS v4     │ │
│  │  • optimization.ts   │            │  • Chart.js            │ │
│  │  • processes.ts      │            │  • 39 Pages            │ │
│  │  • resources.ts      │            │  • 13 UI Components    │ │
│  │  • db.ts (SQLite)    │            │  • 5 Context Providers │ │
│  └──────────────────────┘            └────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────┐                                       │
│  │   Preload Script     │                                       │
│  │  (contextBridge)     │                                       │
│  └──────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing

SmartWiFi AI includes **126 integration tests** across 7 test suites covering all main process modules:

```bash
# Run all tests
npm run test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch
```

### Test Coverage

| Test Suite | Tests | Module Coverage |
|---|---|---|
| `wifi.integration.test.ts` | 12 | Adapter detection, SSID scanning, reconnect, `parseInterfaces` |
| `network.integration.test.ts` | 31 | IP config parsing, DNS extraction, public IP lookup |
| `optimization.integration.test.ts` | 32 | DNS flush/benchmark, TCP reset, IP lease, auto-optimize |
| `processes.integration.test.ts` | 34 | Process scanning, category mapping, JSON parsing edge cases |
| `resources.integration.test.ts` | 17 | CPU/memory/disk/NIC snapshot collection |
| Renderer unit tests | — | Network formatters, MAC address utilities |

### Type Safety

```bash
# Run strict TypeScript compilation across both processes
npm run typecheck

# Check main + preload processes only
npm run typecheck:node

# Check renderer process only
npm run typecheck:web
```

---

## 📦 Packaging & Distribution

SmartWiFi AI uses [electron-builder](https://www.electron.build/) to produce native platform installers:

```bash
# Windows — NSIS setup installer (.exe)
npm run build:win

# macOS — DMG disk image (.dmg)
npm run build:mac

# Linux — AppImage + Debian package (.AppImage, .deb)
npm run build:linux

# Unpacked directory output (for testing)
npm run build:unpack
```

### Windows Installer Features

- Non-one-click installer with directory selection
- Desktop and Start Menu shortcuts created automatically
- Uninstaller registered in Windows Add/Remove Programs
- Output: `dist/smartwifi-ai-1.0.0-setup.exe`

### Build Output

```
out/                    # Production-compiled bundles
├── main/index.js       #   Main process bundle
├── preload/index.js    #   Preload script bundle
└── renderer/           #   Renderer static assets (HTML, JS, CSS)

dist/                   # Packaged installers
└── smartwifi-ai-1.0.0-setup.exe
```

---

## 🔐 Privacy & Security

SmartWiFi AI is designed with a **privacy-first architecture**:

- **100% on-device processing** — All network scans, speed tests, diagnostics, and telemetry data are stored exclusively in a local SQLite database. No data is ever transmitted to external servers.
- **No cloud accounts required** — The application operates fully offline after installation.
- **No analytics or tracking** — Zero telemetry collection, no usage analytics, no crash reporting to third parties.
- **Sandboxed preload** — The renderer process communicates with Node.js APIs exclusively through a secure `contextBridge` preload layer, preventing direct access to system resources from the UI.

---

## 🎨 Theming System

The application features a dynamic HSL-based theming system supporting:

- **3 modes**: Light, Dark, and System (auto-detects OS preference)
- **8 accent color palettes**: Indigo, Violet, Sky, Emerald, Rose, Amber, Cyan, Fuchsia
- **Persistent preferences**: Theme and accent choices are saved to `localStorage` and restored on launch
- **Instant transitions**: All theme changes apply globally in real-time with smooth CSS transitions

Configure themes via **Theme Preferences** in the sidebar or the quick-access theme toggle in the top bar.

---

## 🗂️ Key Configuration Files

| File | Purpose |
|---|---|
| `electron.vite.config.ts` | Multi-process Vite build configuration with vendor chunk splitting |
| `electron-builder.yml` | Native installer packaging (NSIS, DMG, AppImage, DEB) |
| `tsconfig.node.json` | TypeScript config for main + preload (Node.js target) |
| `tsconfig.web.json` | TypeScript config for renderer (DOM + React JSX) |
| `eslint.config.mjs` | ESLint 9 flat configuration with React + TypeScript rules |
| `.prettierrc.yaml` | Prettier formatting rules (single quotes, semicolons, 100 print width) |

---

## 📄 License

This project is licensed under the **MIT License**.

```
Copyright © 2026 Hasintha Perera

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

## 🤝 Contributing

Contributions are welcome! To get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to your branch: `git push origin feat/your-feature`
5. Open a Pull Request

Please ensure your changes pass `npm run typecheck` and `npm run test` before submitting.

---

<p align="center">
  <strong>SmartWiFi AI</strong> — Built with ❤️ by <a href="https://github.com/HasinthaPerera">Hasintha Perera</a>
</p>
