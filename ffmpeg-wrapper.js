// ffmpeg-wrapper.js
// Wrapper around ffmpeg.wasm (@ffmpeg/ffmpeg). Writes inputs into FS and runs commands.
// This is a simplified runner - in production you'd add robust progress parsing, duration probing, more filter_complex building.

const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const logger = require('./utils/logger');

let createFFmpeg, fetchFile; // lazy require

class FFmpegRunner {
  constructor() {
    this.ffmpeg = null;
    this.initialized = false;
    this.usingWasm = true;
  }

  async init() {
    // Try to load @ffmpeg/ffmpeg
    try {
      ({ createFFmpeg, fetchFile } = require('@ffmpeg/ffmpeg'));
      this.ffmpeg = createFFmpeg({ log: false });
      if (!this.ffmpeg.isLoaded()) {
        logger.info('Loading ffmpeg.wasm (this can take a few seconds)...');
        await this.ffmpeg.load();
      }
      this.initialized = true;
      logger.info('ffmpeg.wasm loaded');
    } catch (err) {
      logger.warn('@ffmpeg/ffmpeg not available. Ensure ffmpeg.wasm is installed. Falling back to external ffmpeg via child_process (requires system ffmpeg).');
      this.usingWasm = false;
      // For simplicity in this scaffold, we will still rely on wasm; production fallback omitted for brevity.
      throw err;
    }
  }

  // Writes a local file into ffmpeg FS and returns the fs path used
  async writeInputFile(localPath) {
    if (!this.usingWasm) throw new Error('External ffmpeg fallback not implemented in this scaffold');
    const data = await fetchFile(localPath);
    const name = path.basename(localPath);
    // ensure unique name to avoid collisions
    const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${name}`;
    await this.ffmpeg.FS('writeFile', unique, data);
    return unique;
  }

  // Build args to extract clip, apply filters and output a small mp4.
  buildClipCommand({ input, start = 0, duration = 1.0, filters = [], audioFilters = [], resolution = '1280x720', fps = 24, tmpPrefix = 'webpoop_', index = 0 }) {
    const outName = `${tmpPrefix}seg_${index}.mp4`;
    // Flatten filters into -vf string
    const vfParts = [];
    const encodeOpts = [];
    for (const f of filters || []) {
      if (!f) continue;
      if (typeof f === 'string') vfParts.push(f);
      else if (f.type === 'datamosh' && f.filters) {
        vfParts.push(f.filters);
        if (f.encodeOpts) encodeOpts.push(...f.encodeOpts);
      } else if (f.type === 'video' && f.filter) {
        vfParts.push(f.filter);
      } else if (f.type === 'overlay') {
        // overlay will be handled in a later pass - for now add as marker
        vfParts.push(`null`); // placeholder
      }
    }
    const vf = vfParts.length ? vfParts.join(',') : null;

    // Audio filters
    const afParts = [];
    for (const af of audioFilters || []) {
      if (!af) continue;
      if (typeof af === 'string') afParts.push(af);
      else if (af.type === 'audio' && af.filter) afParts.push(af.filter);
      else if (af.type === 'audio' && af.filterDescriptor === 'sentence-mix') {
        // handle in runClip
        afParts.push(null);
      }
    }
    const af = afParts.filter(Boolean).join(',');

    // Example args for clip extraction and simple encoding
    const args = [
      '-ss', `${start}`,
      '-i', input,
      '-t', `${duration}`,
      // video options
      '-vf', vf || `scale=${resolution.split('x')[0]}:${resolution.split('x')[1]}`,
      '-r', `${fps}`,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p',
      // audio copy or encode
      '-c:a', 'aac',
      '-b:a', '128k',
      // overwrite
      '-y',
      outName
    ];

    // merge custom encode opts (e.g., datamosh)
    if (encodeOpts.length) {
      // splice before output
      args.splice(args.length - 1, 0, ...encodeOpts);
    }

    return { args, outName, vf, af, raw: { filters, audioFilters } };
  }

  async runClip(cmdObj, desiredOutName) {
    if (!this.usingWasm) throw new Error('External ffmpeg fallback not implemented in this scaffold');

    const { args, outName, vf, af, raw } = cmdObj;
    logger.debug(`Running ffmpeg for clip -> ${outName} (args: ${args.join(' ')})`);

    // If any special overlay descriptors exist in raw.filters, we'd need to compose a filter_complex.
    // For brevity, run the basic command; overlay/detailed sentence mixing would be implemented in a fuller runner.
    await this.ffmpeg.run(...args);

    // Read result from FS
    const data = this.ffmpeg.FS('readFile', outName);
    // write to a temporary file on host and return path
    const tmpPath = path.join(os.tmpdir(), `${outName}`);
    await fs.writeFile(tmpPath, Buffer.from(data));
    // Cleanup FS entries to keep memory low
    try { this.ffmpeg.FS('unlink', outName); } catch (e) {}
    return tmpPath;
  }

  async concatSegments(segmentPaths, outputPath, { resolution = '1280x720', fps = 24 } = {}) {
    if (!this.usingWasm) throw new Error('External ffmpeg fallback not implemented in this scaffold');
    // Write each segment into ffmpeg FS and create a concat list file
    const listEntries = [];
    for (let i = 0; i < segmentPaths.length; i++) {
      const seg = segmentPaths[i];
      const fsName = path.basename(seg) + `_in${i}`;
      const data = await fs.readFile(seg);
      await this.ffmpeg.FS('writeFile', fsName, data);
      listEntries.push(`file '${fsName}'`);
    }
    const listName = 'concat_list.txt';
    await this.ffmpeg.FS('writeFile', listName, listEntries.join('\n'));

    const outName = path.basename(outputPath);
    const args = ['-f', 'concat', '-safe', '0', '-i', listName, '-c', 'copy', '-y', outName];
    try {
      await this.ffmpeg.run(...args);
      const data = this.ffmpeg.FS('readFile', outName);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, Buffer.from(data));
      // cleanup
      try { this.ffmpeg.FS('unlink', outName); } catch (e) {}
      try { this.ffmpeg.FS('unlink', listName); } catch (e) {}
      for (let i = 0; i < segmentPaths.length; i++) {
        const fsName = path.basename(segmentPaths[i]) + `_in${i}`;
        try { this.ffmpeg.FS('unlink', fsName); } catch (e) {}
      }
    } catch (err) {
      logger.error('Error concatenating segments: ' + err.message);
      throw err;
    }
  }
}

module.exports = FFmpegRunner;