// effects/visual.js
// Visual effect builders returning filter strings or descriptor objects.

function glitch({ intensity = 5 } = {}) {
  const i = Math.max(0, Math.min(10, intensity));
  // Combine hue, eq, and tblend jitter to simulate glitch
  const hueShift = Math.floor((Math.random() - 0.5) * 60 * (i / 10));
  const satBoost = 1 + (i / 10) * 1.5;
  // flash blend occasionally
  const t = `hue=h=${hueShift}:s=${satBoost.toFixed(2)},tblend=all_mode='overlay':opacity=${(0.2 + i / 10).toFixed(2)},format=yuv420p`;
  return { type: 'video', filter: t };
}

function zoomAndCrop({ intensity = 5, resolution = '1280x720' } = {}) {
  const [w, h] = resolution.split('x').map(Number);
  const zoom = 1 + (Math.random() * (intensity / 10) * 0.8); // 1.0 .. ~1.8
  // Use zoompan or crop/scale + zoom effect
  const vf = `scale=${Math.floor(w * zoom)}:${Math.floor(h * zoom)},crop=${w}:${h},format=yuv420p`;
  return { type: 'video', filter: vf };
}

function randomOverlay({ overlayPath, intensity = 5 } = {}) {
  // descriptor for overlay; ffmpeg runner will create overlay filter using this info
  return { type: 'overlay', overlayPath, opacity: 0.2 + Math.random() * 0.8, x: `(W-w)*${Math.random().toFixed(2)}`, y: `(H-h)*${Math.random().toFixed(2)}` };
}

module.exports = { glitch, zoomAndCrop, randomOverlay };