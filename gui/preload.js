// preload.js - exposes a safe API to the renderer via contextBridge

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('webpoopAPI', {
  selectSources: () => ipcRenderer.invoke('select-sources'),
  selectOutput: () => ipcRenderer.invoke('select-output'),
  startGenerate: (options) => ipcRenderer.invoke('generate', options),
  openOutputFolder: (outputPath) => ipcRenderer.invoke('open-output-folder', outputPath),
  onLog: (fn) => {
    ipcRenderer.on('log', (event, msg) => fn(msg));
  }
});