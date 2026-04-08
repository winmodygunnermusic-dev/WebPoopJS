# WebPoop.js — Mega Deluxe Edition

A chaotic, automatic YouTube Poop (YTP)-style video editor for Node.js.  
WebPoop.js stitches together videos, audio, and images and applies randomized glitchy, meme-style edits using FFmpeg (ffmpeg.wasm). Designed as a modular CommonJS library suitable for older Node environments (Windows 8.1 compatibility targeted).

This combined document contains:
- README (overview, install, usage, API, effects, plugins, troubleshooting, limitations)
- Windows 8.1 installation & usage tutorial (detailed steps, fallbacks, common errors)

---

Table of contents
- Features
- Quick install
- Quick start / example
- API
- Options / configuration
- Effects overview
- Plugin system
- Output & formats
- Troubleshooting (general)
- Windows 8.1 tutorial (detailed)
- Limitations
- Contributing
- License
- Acknowledgements

---

## Features
- Accepts single files and directories (videos, audio, images)
- Media pool with random selection utilities
- Auto YTP generator engine: random slicing, repetition, shuffle
- Datamosh approximation (I-frame manipulation + frame blending)
- Audio effects: pitch shift, reverse, sentence mixing (descriptor)
- Visual effects: glitch, stutter, zoom, color distortion, overlays
- Timeline engine to assemble clips and apply per-clip randomness
- Meme mode: single command to generate a full chaotic YTP
- Plugin system: webpoop.use(plugin)
- Logging of steps to console
- Export to MP4 with resolution and FPS options

---

## Quick install

1. Ensure a Node version that supports async/await (Node 14/16/18 recommended).
2. In your project directory:
```bash
npm init -y
npm install @ffmpeg/ffmpeg
# If your Node < 18, also:
npm install node-fetch@2
```

3. Add the library files (core, effects, engine, utils, ffmpeg-wrapper, index.js) into your project or package it.

---

## Quick start

1. Prepare a `./media` directory with videos/audio/images.
2. Run the provided example script (README_example_usage.js) or call the API from your script.

Example:
```javascript
const webpoop = require('./index');

(async () => {
  await webpoop.generate({
    sources: ['./media'],
    output: './output/final_webpoop.mp4',
    duration: 30,
    chaosLevel: 8,
    fps: 24,
    resolution: '1280x720',
    verbose: true
  });
})();
```

Run:
```bash
node README_example_usage.js
```

---

## API

Main entry: require the package and call generate.

webpoop.generate(options) -> Promise<string>  
- Returns: path to the final output file

Options:
- sources: string | string[] — file paths or directories to scan (default `['./media']`)
- output: string — output mp4 path (default `./output/final.mp4`)
- duration: number — target duration in seconds (default 60)
- chaosLevel: number — 0..10 (default 5). Higher => shorter clips, more effects.
- resolution: string — `WIDTHxHEIGHT` (default `1280x720`)
- fps: number — frames per second (default 24)
- effects: string[] — names of effects to emphasize
- verbose: boolean — enable logging (default true)
- tmpPrefix: string — prefix for temporary segment files (default `webpoop_`)

Plugin usage:
```javascript
webpoop.use(plugin);
```

---

## Effects overview

Video effects:
- datamosh (approximation): reduce I-frames + frame blending
- glitch: hue shift, saturation boost, blend jitter
- zoom & crop: random zooming and crop
- overlay: random images/videos on top of base footage
- frame duplication / stutter

Audio effects:
- pitch shift: asetrate + atempo + aresample trick
- reverse: reverse audio segments
- sentence mixing: slice & reorder (implemented as a descriptor; requires filter_complex)

Bonus / meme effects:
- random subtitles
- ear-rape mode (extreme volume boost — be careful)
- freeze frame spam
- Meme text overlays (Impact-style — requires local font or embedding)

Note: Some advanced features are descriptors/placeholders in the scaffold and need filter_complex building in ffmpeg-wrapper for full functionality.

---

## Plugin system

Plugins can modify timeline or post-process outputs.

Plugin API:
- plugin is a function or object with install method.
- pluginSystem.on(hookName, fn) to subscribe.
- Hooks provided:
  - `timeline:built` — receives `{ timeline, pool, options }`
  - `output:created` — receives `{ output, options }`

Example plugin:
```javascript
webpoop.use((sys) => {
  sys.on('timeline:built', ({ timeline }) => {
    console.log('Plugin: timeline length =', timeline.length);
  });
});
```

---

## Output & formats

- Default: MP4 with H.264 + AAC (subject to wasm build availability).
- Control resolution and FPS via options.
- Temporary segments are written to OS temp directory; ensure disk space.

---

## Troubleshooting (general)

- ffmpeg.wasm load failures:
  - Ensure `@ffmpeg/ffmpeg` is installed.
  - Polyfill fetch for Node < 18: `globalThis.fetch = require('node-fetch')`.
- Memory issues:
  - Increase Node heap: `node --max-old-space-size=4096 script.js`.
  - Reduce duration/resolution for testing.
- Missing encoders:
  - Some wasm builds do not include libx264. Use available codecs or built system ffmpeg.
- Performance:
  - ffmpeg.wasm is slower than native ffmpeg. Use short clips for iteration.

---

## Windows 8.1 Tutorial (detailed)

This section gives step-by-step guidance to run WebPoop.js on Windows 8.1. Because Windows 8.1 is older, follow these recommendations closely.

### Prerequisites (recommended)
- Node.js: Node 14.x or 16.x recommended for Windows 8.1 compatibility.
- npm (bundled with Node)
- At least 4 GB RAM (8+ GB recommended)
- Disk space for temporary files

### 1) Install Node.js
- Download Node 14.x or 16.x installer (64-bit if your OS is 64-bit) from nodejs.org/releases.
- Run installer and verify:
```powershell
node -v
npm -v
```
If Node fails, install Visual C++ Redistributables (2015–2019).

### 2) Project & dependencies
Open PowerShell:
```powershell
mkdir webpoop-project
cd webpoop-project
npm init -y
npm install @ffmpeg/ffmpeg
# If Node < 18:
npm install node-fetch@2
```

If npm install fails due to network, try clearing cache:
```powershell
npm cache clean --force
npm install @ffmpeg/ffmpeg --registry=https://registry.npmjs.org/
```

### 3) Polyfill fetch (if Node < 18)
At the top of your script (before importing ffmpeg):
```javascript
try {
  if (!globalThis.fetch) {
    globalThis.fetch = require('node-fetch');
  }
} catch (e) {
  console.warn('Install node-fetch@2: npm install node-fetch@2');
}
```

### 4) Prepare media folder
Create `./media` and add short clips (.mp4, .webm, .avi), audio (.mp3, .wav), and images (.png, .jpg). Short clips speed iteration.

Example layout:
```
webpoop-project/
  media/
    clip1.mp4
    clip2.mp4
    sound1.mp3
    meme.png
  index.js (library files)
  README_example_usage.js
```

### 5) Run the example
```powershell
node README_example_usage.js
```
If you hit memory errors:
```powershell
node --max-old-space-size=4096 README_example_usage.js
```

### 6) If ffmpeg.wasm fails — use native ffmpeg fallback
1. Download a static ffmpeg build for Windows (e.g., from gyan.dev).
2. Extract and add `ffmpeg.exe` to PATH or note its path.
3. Use `fluent-ffmpeg` or child_process spawning to run native ffmpeg:
```bash
npm install fluent-ffmpeg
```
Example quick concat with fluent-ffmpeg:
```javascript
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath('C:\\ffmpeg\\bin\\ffmpeg.exe');
ffmpeg()
  .input('concat:seg1.mp4|seg2.mp4')
  .output('final.mp4')
  .run();
```
Modify ffmpeg-wrapper.js to support native ffmpeg by spawning process calls and using file system inputs (not wasm FS).

### 7) Common errors & fixes
- "Failed to load ffmpeg.wasm":
  - Ensure @ffmpeg/ffmpeg installed and fetch polyfilled.
- "libx264 not found":
  - Use native ffmpeg or change codec to one available in wasm build.
- OutOfMemory:
  - Reduce resolution/duration, increase Node heap, or switch to native ffmpeg.
- Slow performance:
  - Use native ffmpeg for production or reduce complexity during development.

---

## Limitations & notes
- True datamoshing (manipulating compressed bitstreams) often requires specialized low-level operations; this library approximates datamosh using filters and encoder options.
- ffmpeg.wasm limitations: memory, available codecs, and performance. For heavy or long renders, prefer native ffmpeg.
- Some advanced filter_complex flows (sentence-mix, multi-overlay chains) are left as clear extension points that you'll implement inside ffmpeg-wrapper or as plugins.

---

## Contributing
- Add effects under `/effects`
- Improve ffmpeg runner to support native ffmpeg fallback, advanced filter_complex assembly, and better resource handling
- Add example plugins (subtitles, meme text, ear-rape limiter)
- Add tests and CI

---

## License
MIT — modify and adapt for creative projects. Use ear-rape modes responsibly and warn listeners.

---

## Acknowledgements
- FFmpeg
