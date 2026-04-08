// engine/timeline.js
// Builds a chaotic timeline using the media pool and chaos level

const path = require('path');
const logger = require('../utils/logger');
const effects = require('../effects/index');

function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

class TimelineEngine {
  constructor({ chaosLevel = 5, effects = [], duration = 60, fps = 24, resolution = '1280x720' } = {}) {
    this.chaosLevel = Math.max(0, Math.min(10, chaosLevel));
    this.effects = effects;
    this.duration = duration;
    this.fps = fps;
    this.resolution = resolution;
  }

  buildTimeline(pool) {
    const timeline = [];
    const targetDuration = this.duration;
    let accumulated = 0;
    const avgClipSec = Math.max(0.2, 5 - (this.chaosLevel * 0.4)); // more chaos -> shorter clips

    while (accumulated < targetDuration) {
      // choose source
      const source = pool.pickVideo() || pool.pickImage() || pool.pickAudio();
      if (!source) break;
      // random slice length based on chaos
      const minSeg = Math.max(0.05, 0.1 * (1 + (10 - this.chaosLevel) * 0.1));
      const maxSeg = Math.min(5, avgClipSec * (1 + this.chaosLevel * 0.2));
      const duration = randFloat(minSeg, maxSeg);

      const clip = {
        source,
        start: Math.max(0, randFloat(0, 10)), // naive start within first 10s; robust implementation should probe duration
        duration,
        type: source.type,
        filters: [],
        audioFilters: []
      };

      // Add random effects based on chaosLevel
      if (Math.random() < (this.chaosLevel / 12)) {
        // datamosh occasionally
        clip.filters.push(effects.datamoshFilter({ intensity: this.chaosLevel }));
      }
      if (Math.random() < (this.chaosLevel / 8)) {
        // visual glitch
        clip.filters.push(effects.visualGlitch({ intensity: this.chaosLevel }));
      }
      if (Math.random() < (this.chaosLevel / 6)) {
        // random zoom & crop
        clip.filters.push(effects.randomZoom({ intensity: this.chaosLevel, resolution: this.resolution }));
      }
      // audio fx
      if (Math.random() < (this.chaosLevel / 6) && source.type !== 'image') {
        clip.audioFilters.push(effects.randomPitch({ intensity: this.chaosLevel }));
      }
      if (Math.random() < (this.chaosLevel / 6) && source.type === 'audio') {
        clip.audioFilters.push(effects.audioReverse({ intensity: this.chaosLevel }));
      }

      // occasional overlays
      if (Math.random() < (this.chaosLevel / 5)) {
        const overlay = pool.randomOverlay();
        if (overlay) {
          clip.filters.push(effects.overlayRandom({ overlayPath: overlay.path, intensity: this.chaosLevel }));
        }
      }

      timeline.push(clip);
      accumulated += duration;
    }

    // Shuffle timeline slightly to create chaotic order
    if (this.chaosLevel > 6) {
      timeline.sort(() => Math.random() - 0.5);
    }

    logger.info(`Timeline built: ${timeline.length} clips, total target ${targetDuration}s`);
    return timeline;
  }
}

module.exports = TimelineEngine;