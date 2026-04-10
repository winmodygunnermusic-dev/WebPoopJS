# WebPoop — Setup, Generate & GUI Project

This document explains how to set up WebPoop.js, run generation scripts, and use the included Node GUI (Electron) — a simple WebPoop GUI for Windows 8.1 / Node 14 environments. It contains step-by-step instructions, environment notes, and how to build/run the GUI that wraps the WebPoop generator.

Contents
- Prerequisites
- Repository / file layout
- Install dependencies
- Polyfills & ffmpeg notes (Windows 8.1)
- Run the CLI generator (generated.js)
- Run the Electron GUI (WebPoop GUI)
- GUI features & using it
- Troubleshooting & tips for Windows 8.1
- Next steps / customization

---

Prerequisites
- Node.js (recommended: Node 14.x or Node 16.x for compatibility)
- npm (bundled with Node)
- Recommended: install a native ffmpeg for heavy/large renders (Windows static build). The GUI supports wasm-based ffmpeg via @ffmpeg/ffmpeg, but system ffmpeg is faster and more reliable on Windows 8.1.

---

Repository / file layout (expected)
- index.js (WebPoop core entry)
- core/
- engine/
- effects/
- ffmpeg-wrapper.js
- generated.js (script that generates 2-minute webpoop)
- gui/ (Electron GUI project files)
  - package.json
  - main.js
  - preload.js
  - renderer.js
  - index.html
  - styles.css

You may already have the WebPoop scaffold files from earlier steps. The GUI folder contains the Electron wrapper that calls webpoop.generate(...) via IPC.

---

Install dependencies

1. From project root, install core dependencies:
```bash
npm install @ffmpeg/ffmpeg
# For Node < 18 (Node 14 on Windows 8.1), install fetch polyfill:
npm install node-fetch@2