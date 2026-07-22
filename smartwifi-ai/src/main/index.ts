import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { detectActiveWifiAdapter, scanNearbyNetworks } from './wifi'
import { getNetworkConfiguration, getPublicIpDetails } from './network'
import { initDb, getSpeedTests, insertSpeedTest, clearSpeedTests } from './db'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,

    show: false,
    autoHideMenuBar: true,
    title: 'SmartWiFi AI',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
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

  ipcMain.handle('net:get-config', async () => {
    return await getNetworkConfiguration()
  })

  ipcMain.handle('net:get-public-ip', async () => {
    return await getPublicIpDetails()
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
