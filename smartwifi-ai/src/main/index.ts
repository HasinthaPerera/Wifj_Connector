import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { detectActiveWifiAdapter, scanNearbyNetworks, reconnectWifiAdapter } from './wifi'
import { getNetworkConfiguration, getPublicIpDetails } from './network'
import { initDb, getSpeedTests, insertSpeedTest, clearSpeedTests, deleteSpeedTest } from './db'
import { scanNetworkProcesses } from './processes'
import { getResourceSnapshot } from './resources'
import {
  flushDnsCache,
  releaseIpLease,
  renewIpLease,
  resetTcpStack,
  benchmarkDnsServers,
  runAutoOptimizationSuite,
  resolveDomain,
  performNetworkReset
} from './optimization'

function createSplashWindow(): BrowserWindow {
  const splashWindow = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    title: 'SmartWiFi AI',
    icon,
    webPreferences: {
      sandbox: true
    }
  })

  const splashHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: rgba(15, 23, 42, 0.96);
            color: #f8fafc;
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-radius: 16px;
            border: 1px solid rgba(99, 102, 241, 0.35);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(99, 102, 241, 0.25);
            overflow: hidden;
            user-select: none;
            -webkit-app-region: drag;
          }
          .logo-container {
            position: relative;
            margin-bottom: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .logo-glow {
            position: absolute;
            width: 76px;
            height: 76px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.65) 0%, rgba(16, 185, 129, 0) 70%);
            animation: pulse 2s infinite ease-in-out;
          }
          .icon-svg {
            position: relative;
            z-index: 2;
            width: 56px;
            height: 56px;
            color: #6366f1;
            filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.85));
          }
          h1 {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.5px;
            background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 4px;
          }
          p.subtitle {
            font-size: 11px;
            color: #94a3b8;
            font-weight: 600;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            margin-bottom: 24px;
          }
          .loader-bar {
            width: 260px;
            height: 4px;
            background: rgba(51, 65, 85, 0.6);
            border-radius: 9999px;
            overflow: hidden;
            position: relative;
            margin-bottom: 14px;
          }
          .loader-progress {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            width: 40%;
            background: linear-gradient(90deg, #6366f1 0%, #10b981 100%);
            border-radius: 9999px;
            animation: loading 1.5s infinite ease-in-out;
            box-shadow: 0 0 12px rgba(99, 102, 241, 0.9);
          }
          p.status {
            font-size: 11px;
            color: #64748b;
            font-weight: 500;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(0.92); opacity: 0.5; }
            50% { transform: scale(1.15); opacity: 0.95; }
          }
          @keyframes loading {
            0% { left: -40%; width: 30%; }
            50% { width: 50%; }
            100% { left: 110%; width: 30%; }
          }
        </style>
      </head>
      <body>
        <div class="logo-container">
          <div class="logo-glow"></div>
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
            <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
            <line x1="12" y1="20" x2="12.01" y2="20"></line>
          </svg>
        </div>
        <h1>SmartWiFi AI</h1>
        <p class="subtitle">AI Network Health &amp; Wi-Fi Optimizer</p>
        <div class="loader-bar">
          <div class="loader-progress"></div>
        </div>
        <p class="status">Initializing telemetry engine &amp; local database...</p>
      </body>
    </html>
  `

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`)
  return splashWindow
}

function createWindow(): void {
  const splashWindow = createSplashWindow()

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,

    show: false,
    autoHideMenuBar: true,
    title: 'SmartWiFi AI',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  let splashClosed = false
  const showMainApp = (): void => {
    if (splashClosed) return
    splashClosed = true

    if (!splashWindow.isDestroyed()) {
      splashWindow.close()
    }
    mainWindow.show()
    mainWindow.focus()
  }

  mainWindow.on('ready-to-show', () => {
    // Smooth splash transition — ensure user sees branding during startup
    setTimeout(showMainApp, 1200)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer based on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.smartwifi.ai')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize SQLite database
  initDb()

  // IPC handlers will be registered here as features are added
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('wifi:detect-adapter', async () => {
    return await detectActiveWifiAdapter()
  })

  ipcMain.handle('wifi:scan-networks', async () => {
    return await scanNearbyNetworks()
  })

  ipcMain.handle('wifi:reconnect', async (_, interfaceName?: string, ssid?: string) => {
    return await reconnectWifiAdapter(interfaceName, ssid)
  })

  ipcMain.handle('net:get-config', async () => {
    return await getNetworkConfiguration()
  })

  ipcMain.handle('net:get-public-ip', async () => {
    return await getPublicIpDetails()
  })

  ipcMain.handle('net:scan-processes', async () => {
    return await scanNetworkProcesses()
  })

  ipcMain.handle('sys:get-resources', async () => {
    return await getResourceSnapshot()
  })

  // Optimization handlers
  ipcMain.handle('opt:flush-dns', async () => {
    return await flushDnsCache()
  })

  ipcMain.handle('opt:release-lease', async () => {
    return await releaseIpLease()
  })

  ipcMain.handle('opt:renew-lease', async () => {
    return await renewIpLease()
  })

  ipcMain.handle('opt:reset-tcp', async () => {
    return await resetTcpStack()
  })

  ipcMain.handle('opt:benchmark-dns', async () => {
    return await benchmarkDnsServers()
  })

  ipcMain.handle(
    'opt:auto-optimize',
    async (_, preset: 'gaming' | 'streaming' | 'work' | 'balanced') => {
      return await runAutoOptimizationSuite(preset)
    }
  )

  ipcMain.handle('opt:resolve-domain', async (_, domain: string) => {
    return await resolveDomain(domain)
  })

  ipcMain.handle('opt:full-network-reset', async (_, options) => {
    return await performNetworkReset(options)
  })

  // Database handlers
  ipcMain.handle('db:get-speed-tests', async () => {
    return await getSpeedTests()
  })

  ipcMain.handle('db:insert-speed-test', async (_, result) => {
    return await insertSpeedTest(result)
  })

  ipcMain.handle('db:clear-speed-tests', async () => {
    return await clearSpeedTests()
  })

  ipcMain.handle('db:delete-speed-test', async (_, id: number) => {
    return await deleteSpeedTest(id)
  })

  ipcMain.handle('app:export-csv', async (_, csvContent: string) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Speed Test History',
      defaultPath: 'smartwifi_history.csv',
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    })
    if (canceled || !filePath) return false
    try {
      await fs.promises.writeFile(filePath, csvContent, 'utf-8')
      return true
    } catch (error) {
      console.error('Failed to export CSV:', error)
      throw error
    }
  })

  ipcMain.handle('app:export-pdf', async (event) => {
    const webContents = event.sender
    try {
      const pdfBuffer = await webContents.printToPDF({
        printBackground: true,
        landscape: true,
        margins: { marginType: 'default' }
      })

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Speed Test History to PDF',
        defaultPath: 'smartwifi_history.pdf',
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
      })

      if (canceled || !filePath) return false

      await fs.promises.writeFile(filePath, pdfBuffer)
      return true
    } catch (error) {
      console.error('Failed to export PDF:', error)
      throw error
    }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
