// effects/datamosh.js
// Approximates datamoshing via filter settings and re-encoding tricks.
// True datamoshing often requires container frame deletion; here we approximate.

const logger = require('../utils/logger');

function buildDatamosh({ intensity = 5 } = {}) {
  // intensity 0..10
  const i = Math.max(0, Math.min(10, intensity));
  // Approximation: remove/reduce I-frames by forcing a very large GOP and blend frames
  // -g sets GOP size (keyframe interval). We will set a very large GOP via encoder options where possible.
  // Use tblend to blend neighboring frames to mimic frame smear.
  const blendStrength = 0.2 + (i / 10) * 0.9; // 0.2 .. 1.1
  // Return as an object because it affects encode options and filters
  logger.debug(`Datamosh effect built (intensity=${i}, blend=${blendStrength.toFixed(2)})`);
  return {
    type: 'datamosh',
    filters: `tblend=all_mode='addition':repeatlast=0,format=yuv420p`,
    encodeOpts: ['-g', `${Math.floor(9999 - i * 800)}`, '-preset', 'ultrafast']
  };
}

module.exports = { buildDatamosh };