// main.js - Electron main process
// Runs the WebPoop generator in Node (main process), exposes IPC to renderer.

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Polyfill fetch for Node < 18 to support ffmpeg.wasm in main process
try {
  if (typeof globalThis.fetch === 'undefined') {
    globalThis.fetch = require('node-fetch'); // node-fetch v2
    console.log('[main] Applied node-fetch polyfill');
  }
} catch (e) {
  console.warn('[main] node-fetch not found, ffmpeg.wasm may fail if fetch is required');
}

// Require webpoop (assumes index.js is at project root)
let webpoop;
try {
  webpoop = require(path.join(__dirname, '..', 'index.js'));
} catch (err) {
  console.error('Failed to load webpoop module:', err.message);
  webpoop = null;
}

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
  // win.webContents.openDevTools(); // uncomment for debugging
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers

ipcMain.handle('select-sources', async () => {
  const res = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'openDirectory', 'multiSelections'],
    title: 'Select source files or folders',
    buttonLabel: 'Select'
  });
  if (res.canceled) return [];
  return res.filePaths;
});

ipcMain.handle('select-output', async () => {
  const res = await dialog.showSaveDialog(win, {
    title: 'Choose output file',
    defaultPath: path.join(os.homedir(), 'webpoop_output.mp4'),
    filters: [{ name: 'MP4', extensions: ['mp4'] }]
  });
  if (res.canceled) return null;
  return res.filePath;
});

ipcMain.handle('open-output-folder', async (event, outputPath) => {
  if (!outputPath) return false;
  const folder = path.dirname(outputPath);
  shell.openPath(folder);
  return true;
});

ipcMain.handle('generate', async (event, options) => {
  if (!webpoop) {
    const msg = 'WebPoop module not loaded. Ensure index.js is present and valid.';
    event.sender.send('log', { level: 'error', text: msg });
    throw new Error(msg);
  }

  // Validate options
  const opts = Object.assign({
    sources: ['./media'],
    output: path.join(process.cwd(), 'output', `webpoop_gui_${Date.now()}.mp4`),
    duration: 60,
    chaosLevel: 6,
    resolution: '1280x720',
    fps: 24,
    effects: ['datamosh', 'pitch', 'overlay'],
    tmpPrefix: 'webpoop_gui_',
    verbose: true
  }, options);

  // Ensure output directory exists
  try {
    fs.mkdirSync(path.dirname(opts.output), { recursive: true });
  } catch (e) {}

  event.sender.send('log', { level: 'info', text: `Starting generation: ${opts.output}` });

  // Hook into plugin system to forward logs (if available)
  const loggerForward = (msg) => {
    win.webContents.send('log', { level: 'info', text: msg });
  };

  try {
    // Some long-running runs may require more memory; recommended to run Node with larger heap if needed.
    const resultPath = await webpoop.generate(opts);
    win.webContents.send('log', { level: 'success', text: `Generation complete: ${resultPath}` });
    return { output: resultPath };
  } catch (err) {
    win.webContents.send('log', { level: 'error', text: `Generation failed: ${err.message}` });
    throw err;
  }
});