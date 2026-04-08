# WebPoop.js — Mega Deluxe Edition

A chaotic, automatic YouTube Poop (YTP)-style video editor for Node.js.  
WebPoop.js stitches together videos, audio, and images and applies randomized glitchy, meme-style edits using FFmpeg (ffmpeg.wasm). It is designed as a modular library (CommonJS) you can drop into older Node environments (Windows 8.1 compatibility targeted).

This repository contains:
- core services: input scanning, media pool
- an engine that builds chaotic timelines and applies effects
- effect modules (datamosh, audio transforms, visual glitches)
- a plugin system for custom effects
- a wrapper around ffmpeg.wasm to run commands in memory

IMPORTANT: This project is a scaffold / library. Some advanced ffmpeg filter_complex workflows (true container datamosh, extremely advanced sentence-mix) are outlined and partially implemented; they are easy to extend.

Table of contents
- Features
- Quick install
- Quick start / example
- API
- Options / configuration
- Effects overview
- Plugin system
- Output & formats
- Troubleshooting (including Windows 8.1)
- Limitations
- Contributing
- License

---

Features
- Accepts single files and directories (videos, audio, images)
- Media pool with random selection utilities
- Auto YTP generator engine: random slicing, repetition, shuffle
- Datamosh approximation (I-frame manipulation + frame blending)
- Audio effects: pitch shift, reverse, sentence mixing (descriptor)
- Visual effects: glitch, stutter, zoom, color distortion, overlays
- Timeline engine to assemble clips and apply per-clip randomness
- Meme mode: single command to generate a full chaotic YTP
- Plugin system: webpoop.use(plugin)
- Logging steps to console for progress visibility
- Export to MP4 with resolution and FPS control

---

Quick install

1. Node: use a supported Node version (see Troubleshooting). Recommended LTS: Node 14/16/18.
2. Create a project and install dependencies:

```bash
npm init -y
npm install @ffmpeg/ffmpeg
# Optionally install node-fetch if your Node version lacks global fetch
npm install node-fetch@2