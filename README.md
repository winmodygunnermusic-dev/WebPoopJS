# WebPoop.js — Mega Deluxe Edition (Updated)

A chaotic, automatic YouTube Poop (YTP)-style video generator for Node.js.  
This project stitches together videos, audio, and images and applies randomized glitchy, meme-style edits using ffmpeg (ffmpeg.wasm or system ffmpeg). It is designed as a modular CommonJS library with compatibility goals for older environments (Node 14 / Windows 8.1).

This README is updated to include:
- CLI generator script: `generated.js` (creates a 2-minute YTP from multiple randomized segments)
- A simple Electron GUI at `gui/` (WebPoop GUI)
- Notes and tips for Windows 8.1 and Node 14
- Usage examples and troubleshooting

Table of contents
- Features
- Quick install
- Quick start (CLI: generated.js)
- API (programmatic)
- Electron GUI (gui/)
- Windows 8.1 & Node 14 notes
- Tips for ffmpeg (wasm vs system)
- Troubleshooting
- Project layout
- Contributing & next steps
- License

---

Features
- Input scanning (files & folders): videos, audio, images
- Media pool and random selection utilities
- Auto YTP generator engine (random slicing, shuffle, repeats)
- Effect modules (datamosh approximation, pitch, reverse, visual glitches, overlays)
- Timeline engine that places clips, applies random effects and syncs audio loosely
- Plugin system: `webpoop.use(plugin)`
- Logging of steps and progress
- `generated.js`: ready script to produce a 2-minute YTP (4 × 30s segments) and concatenate them
- Optional Electron GUI (`gui/`) for a small cross-platform interface
- Modular structure for easy extension

---

Quick install

1. Clone repository or copy project files into your working folder.

2. Install core deps:
```bash
npm install @ffmpeg/ffmpeg
# If Node < 18 (Node 14/16), install fetch polyfill:
npm install node-fetch@2