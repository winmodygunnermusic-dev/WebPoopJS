// effects/audio.js
// Audio effect builders that produce -af filter strings or descriptors.

const logger = require('../utils/logger');

function randomPitch({ intensity = 5 } = {}) {
  const i = Math.max(0, Math.min(10, intensity));
  // Map intensity to pitch scale (0.6 .. 1.8)
  const scale = 1 + ((Math.random() > 0.5 ? 1 : -1) * (i / 10) * (0.8));
  // Implement via asetrate + atempo + aresample
  // asetrate will change pitch; atempo adjusts speed back (limit atempo between 0.5 and 2.0)
  // For simplicity wrap into a filter chain string:
  const pitchFilter = `asetrate=44100*${scale.toFixed(3)},aresample=44100,atempo=${(1 / scale).toFixed(3)}`;
  logger.debug(`Random pitch filter: ${pitchFilter}`);
  return { type: 'audio', filter: pitchFilter };
}

function reverse({ intensity = 5 } = {}) {
  // Just reverse audio segment
  return { type: 'audio', filter: 'areverse' };
}

function sentenceMix({ intensity = 6 } = {}) {
  // This is a descriptor: actual implementation should split & rearrange via atrim/filter_complex
  return { type: 'audio', filterDescriptor: 'sentence-mix' }; // handled in ffmpeg runner
}

module.exports = { randomPitch, reverse, sentenceMix };