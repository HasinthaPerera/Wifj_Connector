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

function createWindow(): void {
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
