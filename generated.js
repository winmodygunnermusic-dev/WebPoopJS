/**
 * generated.js
 * Generate a 2-minute "poop" video by rendering multiple randomized segments
 * with WebPoop.js and concatenating them into one output.
 *
 * Designed for Node 14 (no top-level await), CommonJS, and Windows 8.1 support.
 *
 * Usage:
 *   node generated.js
 *
 * Notes:
 * - Requires your WebPoop scaffold (index.js, etc.) in the same folder.
 * - Installs (if needed): npm install node-fetch@2 (for Node < 18)
 * - Requires system ffmpeg in PATH to perform concat/re-encode step.
 *   If you prefer ffmpeg.wasm-only, adapt ffmpeg-wrapper.js to concat in-wasm.
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');

// Polyfill global fetch for Node < 18 (Windows 8.1 / Node 14)
try {
  if (typeof globalThis.fetch === 'undefined') {
    // node-fetch v2 exports a function; ensure it is installed
    // Install with: npm install node-fetch@2
    globalThis.fetch = require('node-fetch');
    console.log('[INFO] Applied fetch polyfill using node-fetch');
  }
} catch (err) {
  console.warn('[WARN] fetch polyfill not applied. If ffmpeg.wasm fails to load, install node-fetch@2 and retry: npm install node-fetch@2');
}

// Import the webpoop module (CommonJS)
const webpoop = require('./index'); // adjust if packaged differently

// Small helper to sleep
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Ensure a temp directory for segments
const TMP_DIR = path.join(os.tmpdir(), 'webpoop_generated_segments');
const FINAL_OUTPUT = path.resolve('./output/webpoop_2min_final.mp4');

async function ensureTmp() {
  try {
    await fs.mkdir(TMP_DIR, { recursive: true });
  } catch (err) {
    // ignore
  }
}

// Check for system ffmpeg availability (used for concatenation/re-encode)
function hasSystemFFmpeg() {
  try {
    const res = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return res.status === 0 || res.status === null;
  } catch (e) {
    return false;
  }
}

// Create a safe file path for each segment
function segPath(i) {
  return path.join(TMP_DIR, `seg_${i}.mp4`);
}

// Generate N segments of length segmentSec each, with randomized chaos
async function generateSegments({ count = 4, segmentSec = 30, baseChaos = 6, verbose = true } = {}) {
  const segFiles = [];
  for (let i = 0; i < count; i++) {
    // Randomize chaos a bit per segment
    const chaos = Math.max(0, Math.min(10, Math.round(baseChaos + (Math.random() - 0.5) * 4)));
    const out = segPath(i);
    const opts = {
      sources: ['./media'],
      output: out,
      duration: segmentSec,
      chaosLevel: chaos,
      resolution: '1280x720',
      fps: 24,
      effects: ['datamosh', 'pitch', 'overlay'],
      tmpPrefix: `webpoop_tmp_${i}_`,
      verbose: verbose
    };
    console.log(`[STEP] Rendering segment ${i + 1}/${count} -> ${out} (chaos=${chaos})`);
    try {
      const result = await webpoop.generate(opts);
      // webpoop.generate returns the final output path (should equal opts.output)
      console.log(`[INFO] Segment ${i} generated: ${result}`);
      segFiles.push(result);
      // Small pause to let system breathe (helps on low-memory machines)
      await wait(500);
    } catch (err) {
      console.error(`[ERROR] Failed to generate segment ${i}: ${err.message}`);
      throw err;
    }
  }
  return segFiles;
}

// Build a ffmpeg concat list file for the system ffmpeg concat demuxer
async function writeConcatList(listPath, files) {
  const lines = files.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');
  await fs.writeFile(listPath, lines, 'utf8');
}

// Use system ffmpeg to concat and re-encode into final output
function concatWithSystemFFmpeg(listFile, outPath) {
  // We'll re-encode to ensure codec compatibility and avoid streammap issues
  const args = [
    '-f', 'concat',
    '-safe', '0',
    '-i', listFile,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '20',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-y',
    outPath
  ];
  console.log('[STEP] Running system ffmpeg to concatenate and encode final video...');
  const proc = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (proc.error) {
    throw proc.error;
  }
  if (proc.status !== 0) {
    throw new Error(`ffmpeg exited with code ${proc.status}`);
  }
  console.log('[DONE] Concatenation completed.');
}

// Fallback: If system ffmpeg isn't available, try to concatenate in-node by copying and hoping codecs match.
// NOTE: This will often fail if codecs differ; still we try simple concat demuxer in a spawned ffmpeg if wasm runner unavailable
async function fallbackConcat(files, outPath) {
  throw new Error('No system ffmpeg available. Please install ffmpeg and ensure it is in your PATH. See README / Windows tutorial.');
}

// Main orchestration
(async () => {
  console.log('[WEBPOOP-GENERATOR] Starting 2-minute generation run');

  // Ensure tmp dir
  await ensureTmp();

  // Render 4 x 30s segments -> 120s (2 minutes)
  const SEGMENT_COUNT = 4;
  const SEGMENT_SEC = 30;
  try {
    const segments = await generateSegments({ count: SEGMENT_COUNT, segmentSec: SEGMENT_SEC, baseChaos: 7, verbose: true });

    // Verify segments exist
    for (const s of segments) {
      if (!fsSync.existsSync(s)) {
        throw new Error(`Segment missing: ${s}`);
      }
    }

    // Prepare concat list file
    const listFile = path.join(TMP_DIR, 'concat_list.txt');
    await writeConcatList(listFile, segments);

    // Use system ffmpeg if available
    if (hasSystemFFmpeg()) {
      concatWithSystemFFmpeg(listFile, FINAL_OUTPUT);
      console.log(`[SUCCESS] Final output created: ${FINAL_OUTPUT}`);
    } else {
      // Try fallback or instruct user
      await fallbackConcat(segments, FINAL_OUTPUT);
    }

    console.log('[WEBPOOP-GENERATOR] Completed successfully.');
    console.log('You can preview with VLC or re-encode/normalize as needed.');
  } catch (err) {
    console.error('[FATAL] Generation failed:', err);
    console.error('Hints: Ensure @ffmpeg/ffmpeg and node-fetch@2 are installed, or install a native ffmpeg and add it to PATH.');
    console.error('For Windows 8.1, you may need to run Node with more memory: node --max-old-space-size=4096 generated.js');
    process.exitCode = 1;
  }
})();