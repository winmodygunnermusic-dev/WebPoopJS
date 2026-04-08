// effects/index.js
// Exposes effect helper functions that return filter strings or descriptors.
// Each function returns a string usable in ffmpeg -vf or -af filters, or an object.

const datamosh = require('./datamosh');
const audio = require('./audio');
const visual = require('./visual');

module.exports = {
  // video filters return ffmpeg filter expressions or objects
  datamoshFilter: datamosh.buildDatamosh,
  visualGlitch: visual.glitch,
  randomZoom: visual.zoomAndCrop,
  overlayRandom: visual.randomOverlay,
  // audio filters
  randomPitch: audio.randomPitch,
  audioReverse: audio.reverse,
  sentenceMix: audio.sentenceMix
};