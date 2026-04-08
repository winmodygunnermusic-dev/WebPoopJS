// core/input.js
// Scans files and directories and categorizes media files

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const VIDEO_EXT = new Set(['.mp4', '.webm', '.avi', '.mov', '.mkv']);
const AUDIO_EXT = new Set(['.mp3', '.wav', '.ogg', '.m4a']);
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif']);

class InputScanner {
  constructor() {}

  async scan(paths) {
    const files = [];
    for (const p of paths) {
      const stat = await this._safeStat(p);
      if (!stat) continue;
      if (stat.isDirectory()) {
        const nested = await this._scanDir(p);
        files.push(...nested);
      } else if (stat.isFile()) {
        files.push(this._fileEntry(p));
      }
    }
    // categorize
    const categorized = {
      videos: files.filter(f => f.type === 'video'),
      audio: files.filter(f => f.type === 'audio'),
      images: files.filter(f => f.type === 'image')
    };
    logger.info(`Found ${categorized.videos.length} videos, ${categorized.audio.length} audio, ${categorized.images.length} images`);
    return categorized;
  }

  async _scanDir(dir) {
    const entries = await fs.readdir(dir);
    const out = [];
    for (const name of entries) {
      const full = path.join(dir, name);
      const stat = await this._safeStat(full);
      if (!stat) continue;
      if (stat.isDirectory()) {
        out.push(...await this._scanDir(full));
      } else if (stat.isFile()) {
        out.push(this._fileEntry(full));
      }
    }
    return out;
  }

  _fileEntry(fullPath) {
    const ext = path.extname(fullPath).toLowerCase();
    let type = 'other';
    if (VIDEO_EXT.has(ext)) type = 'video';
    else if (AUDIO_EXT.has(ext)) type = 'audio';
    else if (IMAGE_EXT.has(ext)) type = 'image';
    return { path: fullPath, name: path.basename(fullPath), ext, type };
  }

  async _safeStat(p) {
    try {
      return await fs.stat(p);
    } catch (err) {
      logger.warn(`Skipping ${p}: ${err.message}`);
      return null;
    }
  }
}

module.exports = InputScanner;