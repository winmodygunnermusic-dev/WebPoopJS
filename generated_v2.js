/**
 * generated_v2.js — WebPoop Generator Version 2
 *
 * - Node 14 / CommonJS compatible
 * - Windows 8.1 friendly (polyfill fetch if Node < 18)
 * - Builds longer video output by concatenating randomized segments or by rendering a single long file if no system ffmpeg
 * - New features: audio normalization, ear-rape toggle (with limiter), random subtitles (SRT), thumbnail generation
 *
 * Usage:
 *   node generated_v2.js
 *
 * Requirements:
 * - WebPoop scaffold (index.js, core/, engine/, effects/, ffmpeg-wrapper.js) in same project
 * - Prefer system ffmpeg in PATH for concat & post-processing (recommended)
 * - If Node < 18, install node-fetch@2 and ensure it's available:
 *     npm install node-fetch@2
 *   The script will try to polyfill fetch automatically.
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

// Polyfill global fetch for Node < 18 (Windows 8.1 / Node 14)
try {
  if (typeof globalThis.fetch === 'undefined') {
    // node-fetch v2 recommended
    globalThis.fetch = require('node-fetch');
    console.log('[INFO] Applied fetch polyfill using node-fetch');
  }
} catch (err) {
  console.warn('[WARN] fetch polyfill not applied. If ffmpeg.wasm fails to load, install node-fetch@2: npm install node-fetch@2');
}

// Load webpoop library
let webpoop;
try {
  webpoop = require('./index'); // adjust path if packaged differently
} catch (err) {
  console.error('[FATAL] Could not load webpoop module. Ensure index.js is present:', err.message);
  process.exit(1);
}

// ---------- CONFIG: tweak these to change behavior ----------
const CONFIG = {
  totalDuration: 10 * 60,      // total duration in seconds (default 10 minutes)
  segmentSec: 30,              // target segment length in seconds (segments will vary slightly)
  baseChaos: 6,                // base chaos level 0..10
  effects: ['datamosh', 'pitch', 'overlay'],
  resolution: '1280x720',
  fps: 24,
  tmpDirPrefix: 'webpoop_v2_',
  outputPath: path.resolve('./output/webpoop_v2_long_final.mp4'),
  normalizeAudio: true,        // run loudnorm post-process (requires system ffmpeg)
  earRapeMode: false,          // if true add volume boost + limiter (use with caution)
  earRapeDB: 10,               // how many dB to boost in ear-rape mode
  generateSubtitles: true,     // generate and embed a random SRT (requires system ffmpeg)
  subtitleCount: 20,           // number of subtitle entries to generate
  makeThumbnail: true,         // generate thumbnail from final video
  thumbnailTime: 5,            // seconds into video to capture thumbnail
  verbose: true
};
// -----------------------------------------------------------

function log(level, ...args) {
  if (!CONFIG.verbose && ['debug'].includes(level)) return;
  const tag = level.toUpperCase();
  console.log(`[${tag}]`, ...args);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const TMPDIR = path.join(os.tmpdir(), `${CONFIG.tmpDirPrefix}${Date.now()}`);
async function ensureTmp() {
  await fs.mkdir(TMPDIR, { recursive: true });
  log('debug', 'Temporary dir:', TMPDIR);
}

function hasSystemFFmpeg() {
  try {
    const res = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return res.status === 0 || res.status === null;
  } catch (e) {
    return false;
  }
}

function segPath(i) {
  return path.join(TMPDIR, `seg_${i}.mp4`);
}

// generate randomized segments using webpoop.generate
async function generateSegments({ count, segmentSec }) {
  const paths = [];
  for (let i = 0; i < count; i++) {
    const jitter = Math.floor((Math.random() - 0.5) * 6); // -3..+3s jitter
    const segLen = Math.max(3, Math.round(segmentSec + jitter));
    const chaos = Math.max(0, Math.min(10, Math.round(CONFIG.baseChaos + (Math.random() - 0.5) * 4)));
    const out = segPath(i);

    const opts = {
      sources: ['./media'],
      output: out,
      duration: segLen,
      chaosLevel: chaos,
      resolution: CONFIG.resolution,
      fps: CONFIG.fps,
      effects: CONFIG.effects,
      tmpPrefix: `webpoop_v2_seg_${i}_`,
      verbose: CONFIG.verbose
    };

    log('info', `Rendering segment ${i + 1}/${count} -> ${out} (len=${segLen}s, chaos=${chaos})`);
    try {
      const res = await webpoop.generate(opts);
      if (!res || !fsSync.existsSync(res)) {
        log('warn', `Segment generation reported success but file not found: ${res}`);
      } else {
        log('info', `Segment ${i} done: ${res}`);
      }
      paths.push(out);
    } catch (err) {
      log('error', `Failed to create segment ${i}: ${err && err.message ? err.message : err}`);
      throw err;
    }

    // brief pause for low-memory systems
    await wait(400);
  }
  return paths;
}

async function writeConcatList(listPath, files) {
  const lines = files.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');
  await fs.writeFile(listPath, lines, 'utf8');
}

// run system ffmpeg to concat (and optionally post-process)
function concatWithFFmpeg(listFile, outPath, { reencode = true, normalize = false, earRape = false, earDB = 10 } = {}) {
  const args = ['-f', 'concat', '-safe', '0', '-i', listFile];

  // choose to re-encode to H.264/AAC for compatibility
  if (reencode) {
    args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-c:a', 'aac', '-b:a', '128k');
  } else {
    args.push('-c', 'copy');
  }

  // add movflags for web optimization
  args.push('-movflags', '+faststart', '-y', outPath);

  log('info', 'Running ffmpeg concat (system) ...');
  log('debug', 'ffmpeg args:', args.join(' '));
  const proc = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (proc.error) throw proc.error;
  if (proc.status !== 0) throw new Error(`ffmpeg concat failed with exit code ${proc.status}`);

  // normalization step (separate pass to keep concat simple)
  if (normalize || earRape) {
    const tmpPost = outPath.replace(/\.mp4$/i, '_post.mp4');
    const afs = [];
    if (earRape) {
      afs.push(`volume=${earDB}dB`); // boost
      // limiter to avoid extreme clipping (this is simplistic)
      afs.push('alimiter=limit=0.95');
    }
    if (normalize) {
      // loudnorm params: I, TP, LRA recommended defaults
      afs.push('loudnorm=I=-16:TP=-1.5:LRA=11');
    }

    if (afs.length > 0) {
      const args2 = ['-i', outPath, '-c:v', 'copy', '-af', afs.join(','), '-y', tmpPost];
      log('info', 'Running ffmpeg post-process (normalize/earRape) ...');
      log('debug', 'ffmpeg args:', args2.join(' '));
      const p2 = spawnSync('ffmpeg', args2, { stdio: 'inherit' });
      if (p2.error) throw p2.error;
      if (p2.status !== 0) throw new Error(`ffmpeg post-process failed with exit code ${p2.status}`);
      // replace original
      fsSync.renameSync(tmpPost, outPath);
    }
  }
}

// create and optionally embed subtitles (random silly captions)
async function createRandomSrt(totalDuration, count, outSrtPath) {
  const phrases = [
    "WHEN THE CODE HITS", "NOPE.jpg", "WHAT ARE YOU DOING", "MEME INCOMING", "TRY AGAIN LATER",
    "I DIDN'T ASK", "YTP INTENSIFIES", "ERROR: FUN DETECTED", "LOADING... MEMES", "TOP TEXT"
  ];
  const entries = [];
  for (let i = 0; i < count; i++) {
    const start = Math.floor(Math.random() * Math.max(1, totalDuration - 2));
    const end = Math.min(totalDuration, start + 1 + Math.floor(Math.random() * 3)); // 1..4s display
    const t2s = (s) => {
      const hh = String(Math.floor(s / 3600)).padStart(2, '0');
      const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      return `${hh}:${mm}:${ss},000`;
    };
    const text = phrases[Math.floor(Math.random() * phrases.length)];
    entries.push(`${i + 1}\n${t2s(start)} --> ${t2s(end)}\n${text}\n`);
  }
  await fs.writeFile(outSrtPath, entries.join('\n'), 'utf8');
  log('info', `Generated random SRT with ${count} entries: ${outSrtPath}`);
}

// embed SRT as soft subtitles using ffmpeg (requires system ffmpeg)
function embedSubtitles(inputPath, srtPath, outputPath) {
  const args = ['-i', inputPath, '-i', srtPath, '-c', 'copy', '-c:s', 'mov_text', '-y', outputPath];
  log('info', 'Embedding subtitles via ffmpeg...');
  log('debug', 'ffmpeg args:', args.join(' '));
  const proc = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (proc.error) throw proc.error;
  if (proc.status !== 0) throw new Error(`ffmpeg embed subs failed with exit code ${proc.status}`);
}

// create a thumbnail from a time offset
function makeThumbnail(inputPath, outThumbPath, timeSec = 5) {
  const args = ['-ss', String(timeSec), '-i', inputPath, '-frames:v', '1', '-q:v', '2', '-y', outThumbPath];
  log('info', 'Creating thumbnail via ffmpeg...');
  const proc = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (proc.error) throw proc.error;
  if (proc.status !== 0) throw new Error(`ffmpeg thumbnail failed with exit code ${proc.status}`);
}

// Main orchestrator
(async () => {
  log('info', 'WebPoop Generator v2 starting');
  await ensureTmp();

  const total = Number(CONFIG.totalDuration) || 60;
  const seg = Math.max(3, Number(CONFIG.segmentSec) || 30);
  const segCount = Math.ceil(total / seg);

  log('info', `Total target duration: ${total}s; segment target: ${seg}s; segments: ${segCount}`);

  try {
    if (hasSystemFFmpeg()) {
      log('info', 'System ffmpeg detected — using segment generation + concat workflow');

      // generate segments
      const segPaths = await generateSegments({ count: segCount, segmentSec: seg });

      // verify segments
      for (const p of segPaths) {
        if (!fsSync.existsSync(p)) {
          throw new Error(`Segment missing after generation: ${p}`);
        }
      }

      // write concat list and run concat
      const listFile = path.join(TMPDIR, 'concat_list.txt');
      await writeConcatList(listFile, segPaths);

      // concat + re-encode
      concatWithFFmpeg(listFile, CONFIG.outputPath, {
        reencode: true,
        normalize: CONFIG.normalizeAudio,
        earRape: CONFIG.earRapeMode,
        earDB: CONFIG.earRapeDB
      });

      // subtitles embedding (optional)
      let finalPath = CONFIG.outputPath;
      if (CONFIG.generateSubtitles) {
        const srtPath = path.join(TMPDIR, 'random_subs.srt');
        await createRandomSrt(total, CONFIG.subtitleCount, srtPath);
        const withSubs = CONFIG.outputPath.replace(/\.mp4$/i, '_subbed.mp4');
        embedSubtitles(finalPath, srtPath, withSubs);
        // replace final
        await fs.rename(withSubs, finalPath);
        log('info', 'Subtitles embedded into final video');
      }

      // thumbnail
      if (CONFIG.makeThumbnail) {
        const thumbPath = CONFIG.outputPath.replace(/\.mp4$/i, '_thumb.jpg');
        makeThumbnail(CONFIG.outputPath, thumbPath, CONFIG.thumbnailTime);
        log('info', `Thumbnail created: ${thumbPath}`);
      }

      log('success', `Final video created: ${CONFIG.outputPath}`);
    } else {
      log('warn', 'System ffmpeg not found. Falling back to a single long wasm-based render (may be slower and memory-heavy).');
      // fallback: call webpoop.generate once for the full duration and rely on ffmpeg.wasm inside the webpoop runner
      const fallbackOut = CONFIG.outputPath;
      const opts = {
        sources: ['./media'],
        output: fallbackOut,
        duration: total,
        chaosLevel: CONFIG.baseChaos,
        resolution: CONFIG.resolution,
        fps: CONFIG.fps,
        effects: CONFIG.effects,
        tmpPrefix: `webpoop_v2_full_`,
        verbose: CONFIG.verbose
      };
      log('info', `Starting single-run generate for ${total}s -> ${fallbackOut}`);
      const res = await webpoop.generate(opts);
      log('success', `Single-run generate completed: ${res}`);
      // if subtitles requested, we can't embed without ffmpeg; just write SRT next to the file
      if (CONFIG.generateSubtitles) {
        const srtPath = CONFIG.outputPath.replace(/\.mp4$/i, '.srt');
        await createRandomSrt(total, CONFIG.subtitleCount, srtPath);
        log('info', `Generated SRT beside file (embedding requires system ffmpeg): ${srtPath}`);
      }
      if (CONFIG.makeThumbnail && hasSystemFFmpeg()) {
        const thumbPath = CONFIG.outputPath.replace(/\.mp4$/i, '_thumb.jpg');
        makeThumbnail(CONFIG.outputPath, thumbPath, CONFIG.thumbnailTime);
        log('info', `Thumbnail created: ${thumbPath}`);
      } else if (CONFIG.makeThumbnail) {
        log('warn', 'Cannot create thumbnail without system ffmpeg in fallback mode.');
      }
    }

    log('info', 'Cleaning up temporary files (preserving final output)');
    // Optionally remove tmp dir; leave it if debugging
    // await fs.rmdir(TMPDIR, { recursive: true });

    log('done', 'Generation v2 finished');
  } catch (err) {
    log('error', 'Generation failed:', err && err.message ? err.message : err);
    log('debug', err && err.stack ? err.stack : '');
    process.exitCode = 1;
  }
})();