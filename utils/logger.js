// utils/logger.js
// Small logging helper to show steps and status messages

const util = require('util');

let verbose = true;

function setVerbose(v) {
  verbose = v;
}

function step(msg) {
  console.log(`[STEP] ${msg}`);
}
function info(msg) {
  if (verbose) console.log(`[INFO] ${msg}`);
}
function warn(msg) {
  console.warn(`[WARN] ${msg}`);
}
function error(msg) {
  console.error(`[ERROR] ${msg}`);
}
function success(msg) {
  console.log(`[DONE] ${msg}`);
}
function debug(msg) {
  if (verbose) console.log(`[DEBUG] ${msg}`);
}

module.exports = { setVerbose, step, info, warn, error, success, debug };