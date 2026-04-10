// renderer.js - UI logic in renderer (browser) context
// Access the exposed API via window.webpoopAPI

const btnSelectSources = document.getElementById('btnSelectSources');
const sourcesList = document.getElementById('sourcesList');
const durationInput = document.getElementById('duration');
const chaosInput = document.getElementById('chaos');
const chaosVal = document.getElementById('chaosVal');
const resolutionInput = document.getElementById('resolution');
const fpsInput = document.getElementById('fps');
const btnSelectOutput = document.getElementById('btnSelectOutput');
const outputPathBox = document.getElementById('outputPath');
const btnStart = document.getElementById('btnStart');
const logBox = document.getElementById('log');
const btnOpenFolder = document.getElementById('btnOpenFolder');

let selectedSources = [];
let selectedOutput = null;

btnSelectSources.addEventListener('click', async () => {
  const paths = await window.webpoopAPI.selectSources();
  if (paths && paths.length) {
    selectedSources = paths;
    sourcesList.textContent = paths.join('\n');
    appendLog(`[UI] Selected ${paths.length} sources`);
  } else {
    appendLog('[UI] No sources selected');
  }
});

btnSelectOutput.addEventListener('click', async () => {
  const p = await window.webpoopAPI.selectOutput();
  if (p) {
    selectedOutput = p;
    outputPathBox.textContent = p;
    appendLog(`[UI] Output set to ${p}`);
  } else {
    appendLog('[UI] Output selection canceled');
  }
});

chaosInput.addEventListener('input', () => {
  chaosVal.textContent = chaosInput.value;
});

btnStart.addEventListener('click', async () => {
  if (!selectedSources || selectedSources.length === 0) {
    appendLog('[UI] Please select sources before starting');
    return;
  }
  btnStart.disabled = true;
  appendLog('[UI] Starting generation...');
  const opts = {
    sources: selectedSources,
    output: selectedOutput,
    duration: Number(durationInput.value) || 60,
    chaosLevel: Number(chaosInput.value) || 6,
    resolution: resolutionInput.value || '1280x720',
    fps: Number(fpsInput.value) || 24,
    effects: ['datamosh', 'pitch', 'overlay']
  };
  try {
    const res = await window.webpoopAPI.startGenerate(opts);
    appendLog(`[UI] Generation finished. Output: ${res.output}`);
    if (res.output) {
      btnOpenFolder.disabled = false;
      selectedOutput = res.output;
      outputPathBox.textContent = res.output;
    }
  } catch (err) {
    appendLog('[UI] Generation failed: ' + (err && err.message ? err.message : String(err)));
  } finally {
    btnStart.disabled = false;
  }
});

btnOpenFolder.addEventListener('click', async () => {
  if (!selectedOutput) {
    appendLog('[UI] No output to open');
    return;
  }
  await window.webpoopAPI.openOutputFolder(selectedOutput);
});

function appendLog(text) {
  const ts = new Date().toISOString();
  logBox.textContent += `[${ts}] ${text}\n`;
  logBox.scrollTop = logBox.scrollHeight;
}

// receive logs from main
window.webpoopAPI.onLog((msg) => {
  if (!msg) return;
  const level = msg.level || 'info';
  appendLog(`[${level.toUpperCase()}] ${msg.text}`);
});