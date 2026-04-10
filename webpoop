# WebPoop — Tutorial: Generating & Running YTP Videos

This tutorial walks you through creating chaotic YouTube Poop (YTP)-style videos with WebPoop.js, from installation to final delivery. It covers basic usage, options, tips for tuning "chaos", post-processing (audio safety, thumbnails), Windows notes, and plugin examples.

Contents
- Quick summary
- Install & prerequisites
- Preparing media
- Basic usage (example)
- Options explained (chaosLevel, duration, resolution...)
- Effect/behavior tips and presets
- Post-processing (re-encode, audio safety, thumbnails, subtitles)
- Windows (including Windows 8.1) tips
- Plugin example: add meme captions
- Troubleshooting & common errors
- Next steps & recommended workflow

---

Quick summary
- webpoop.generate(options) builds a chaotic timeline from your media folder and renders an MP4.
- Key knobs: duration, chaosLevel (0..10), fps, resolution, and selected effects.
- Always preview and normalize audio before publishing (YTPs can be extremely loud).

---

Install & prerequisites

1. Node: use Node 14/16/18 (async/await compatible).
2. Install ffmpeg.wasm bindings:
```bash
npm install @ffmpeg/ffmpeg
# If Node < 18, also:
npm install node-fetch@2
```
3. If you prefer a native fallback, install an ffmpeg build (e.g., from gyan.dev) and implement a native runner (the scaffold includes places to extend the wrapper).

If Node lacks global fetch (Node < 18), add at top of your script:
```js
try { if (!globalThis.fetch) globalThis.fetch = require('node-fetch'); } catch (e) {}
```

---

Preparing media

Create a `./media` directory and add:
- Videos: .mp4, .webm, .avi
- Audio: .mp3, .wav
- Images: .png, .jpg

Tips:
- Use many short clips (1–10s) for fast, punchy edits.
- Add a few distinct meme PNGs (transparent background) for overlay fun.
- Put long music tracks in audio folder for background bed options.

Directory example:
```
media/
  clips/
    clip1.mp4
    clip2.mp4
  sounds/
    beep.mp3
  images/
    meme1.png
```

---

Basic usage (example)

Save this minimal script (adjust paths as needed) and run with Node:

```js
const webpoop = require('./index'); // or require('webpoop') when packaged

(async () => {
  const output = await webpoop.generate({
    sources: ['./media'],
    output: './output/my_ytp.mp4',
    duration: 45,
    chaosLevel: 7,
    fps: 24,
    resolution: '1280x720',
    effects: ['datamosh','pitch','overlay'],
    verbose: true
  });
  console.log('Rendered:', output);
})();
```

What this does:
- Scans `./media`
- Builds a chaotic timeline of ~45s
- Applies randomized effects based on chaosLevel
- Renders & concatenates intermediate segments into `./output/my_ytp.mp4`

---

Options explained

- sources: string | string[] — file/folder paths to scan.
- output: string — final mp4 output path.
- duration: number — approximate target length in seconds.
- chaosLevel: 0..10 — intensity mapping:
  - 0–2: minimal edits (longer clips, fewer effects)
  - 3–5: moderate edits (shorter clips, occasional effects)
  - 6–8: aggressive (short segments, many effects, overlays)
  - 9–10: extreme (stutter, datamosh, heavy pitch, repeating loops)
- fps: frames per second; lower fps increases stuttery vibe.
- resolution: "WIDTHxHEIGHT" — e.g., "1280x720".
- effects: array of effect names to favor (e.g., ["datamosh","reverse"]).
- verbose: boolean — show progress messages.

---

Effect & behavior tips

- Datamosh: approximated by forcing large GOP and frame blends. Higher chaosLevel -> stronger effect. For true datamosh you’ll need bitstream edits (advanced).
- Pitch shifting: use for short audio bites. Excessive pitch + loudness = unpleasant — cap volume.
- Reverse: dramatic; use in small doses for comedic timing.
- Overlay: use PNGs for transparency; position and opacity are randomized.
- Stutter & Freeze: duplicate very short segments (0.1–0.4s) to create comedic loops.
- Sentence-mix (audio): slice audio into tiny chunks (<0.5s) and rearrange for absurd results.

Recommended presets:
- Chill: chaosLevel 2, duration 60, effects []
- Classic YTP: chaosLevel 6, duration 45, effects ['reverse','pitch','overlay']
- Max Chaos: chaosLevel 9–10, duration 30, effects ['datamosh','stutter','pitch','overlay']

---

Post-processing: re-encode, audio safety, thumbnails

1. Re-encode (compatibility + web optimization):
```
ffmpeg -i my_ytp.mp4 -c:v libx264 -preset fast -crf 20 -c:a aac -b:a 192k -movflags +faststart my_ytp_reencoded.mp4
```

2. Normalize audio (strongly recommended before upload):
```
ffmpeg -i my_ytp.mp4 -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:v copy my_ytp_normalized.mp4
```

3. Apply limiter if you plan to include "ear-rape" snippets, but avoid publishing loud versions:
```
ffmpeg -i in.mp4 -af "acompressor,alimiter=limit=0.95" -c:v copy out_limited.mp4
```

4. Create a thumbnail (at ~5s):
```
ffmpeg -ss 00:00:05 -i my_ytp.mp4 -frames:v 1 -q:v 2 thumb.jpg
```

5. Burn meme text (Impact font on Windows):
```
ffmpeg -i in.mp4 -vf "drawtext=fontfile='C\\:/Windows/Fonts/impact.ttf':text='TOP TEXT':fontsize=72:fontcolor=white:stroke_color=black:stroke_w=3:x=(w-text_w)/2:y=10" -c:a copy out_meme.mp4
```

---

Windows (incl. Windows 8.1) tips

- If Node < 18, install and polyfill fetch: `npm install node-fetch@2` and set `globalThis.fetch = require('node-fetch')`.
- ffmpeg.wasm may be heavy on memory — use `node --max-old-space-size=4096` for longer renders.
- For reliability and performance on Windows 8.1, prefer a native ffmpeg (`ffmpeg.exe`) and adapt the ffmpeg-wrapper for child_process or use `fluent-ffmpeg`.
- Paths with backslashes require escaping in drawtext fontfile and commands: use forward slashes or double-escape backslashes.

---

Plugin example: auto meme captions

A tiny plugin to add a single top/bottom caption to the first clip:

```js
// plugins/memeCaption.js
module.exports = function MemeCaptionPlugin(sys) {
  sys.on('timeline:built', ({ timeline }) => {
    if (!timeline || timeline.length === 0) return;
    // inject a drawtext filter on the first clip
    const first = timeline[0];
    const topText = "WHEN THE CODE GLITCHES";
    const draw = {
      type: 'video',
      filter: `drawtext=fontfile='/path/to/impact.ttf':text='${topText}':fontcolor=white:fontsize=48:box=1:boxcolor=black@0.6:x=(w-text_w)/2:y=10`
    };
    first.filters = first.filters || [];
    first.filters.push(draw);
  });
};
```

Use it:
```js
const webpoop = require('./index');
webpoop.use(require('./plugins/memeCaption'));
await webpoop.generate({ sources:['./media'], output:'./out.mp4', duration:20 });
```

---

Troubleshooting & common errors

- ffmpeg.wasm fails to load:
  - Ensure `@ffmpeg/ffmpeg` is installed and fetch is available.
  - Try native ffmpeg fallback if memory/encoder issues persist.
- "No video" or black frames:
  - Re-encode to ensure proper codecs, or probe the file with ffprobe.
- Audio too loud or clipping:
  - Normalize (loudnorm) or limit peaks before publishing.
- Slow render / OOM:
  - Reduce resolution, length, or run on native ffmpeg.

---

Recommended workflow (fast iteration)

1. Use short duration (10–30s) + medium chaos for testing.
2. Run generate, preview in VLC/ffplay.
3. Adjust chaosLevel/effects and rerun until happy.
4. Re-encode and normalize.
5. Build thumbnail, add metadata/subtitles.
6. Upload to YouTube with warnings for flashing or loud audio.

---

Safety & ethics

- Warn viewers about flashing content and ear-rape audio.
- Respect copyright and privacy — YTPs often reuse clips; check platform and local laws.

---

Next steps & customizations

- Implement a native ffmpeg runner for faster, large renders.
- Add more plugins (random subtitles, automatic chapter generation, meme pack).
- Extend effects: real datamosh via bitstream editing, advanced filter_complex audio sentence-mix.

If you want, I can:
- produce a ready-to-run PowerShell script for Windows that performs generate → normalize → thumbnail steps, or
- implement the native ffmpeg fallback runner and example commands tailored to Windows 8.1.

Which would you like next?
```