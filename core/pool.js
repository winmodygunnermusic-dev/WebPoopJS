// core/pool.js
// MediaPool holds categorized media and provides random selections

const logger = require('../utils/logger');

class MediaPool {
  constructor() {
    this.videos = [];
    this.audio = [];
    this.images = [];
  }

  addFiles(categorized) {
    if (categorized.videos) this.videos.push(...categorized.videos);
    if (categorized.audio) this.audio.push(...categorized.audio);
    if (categorized.images) this.images.push(...categorized.images);
    logger.info(`MediaPool: videos=${this.videos.length} audio=${this.audio.length} images=${this.images.length}`);
  }

  // Random pick helpers
  pickVideo() {
    return this._randomPick(this.videos);
  }
  pickAudio() {
    return this._randomPick(this.audio);
  }
  pickImage() {
    return this._randomPick(this.images);
  }

  _randomPick(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Create a mixed selection for overlays/FX as needed
  randomOverlay() {
    // prefer images, fallback to short videos
    const img = this.pickImage();
    if (img) return img;
    const v = this.pickVideo();
    return v;
  }
}

module.exports = MediaPool;