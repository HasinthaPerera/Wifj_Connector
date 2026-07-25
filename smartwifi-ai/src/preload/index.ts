import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  detectAdapter: () => ipcRenderer.invoke('wifi:detect-adapter'),
  scanNetworks: () => ipcRenderer.invoke('wifi:scan-networks'),
  getNetworkConfig: () => ipcRenderer.invoke('net:get-config'),
  getPublicIp: () => ipcRenderer.invoke('net:get-public-ip'),
  db: {
    getSpeedTests: () => ipcRenderer.invoke('db:get-speed-tests'),
    insertSpeedTest: (result: Record<string, unknown>) => ipcRenderer.invoke('db:insert-speed-test', result),
    clearSpeedTests: () => ipcRenderer.invoke('db:clear-speed-tests'),
    deleteSpeedTest: (id: number) => ipcRenderer.invoke('db:delete-speed-test', id)
  },
  exportCsv: (content: string) => ipcRenderer.invoke('app:export-csv', content),
  exportPdf: () => ipcRenderer.invoke('app:export-pdf')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
