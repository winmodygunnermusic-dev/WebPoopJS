// WebPoop.js - Mega Deluxe Edition (entry point)
// CommonJS module

const path = require('path');
const InputScanner = require('./core/input');
const MediaPool = require('./core/pool');
const TimelineEngine = require('./engine/timeline');
const FFmpegRunner = require('./ffmpeg-wrapper');
const PluginSystem = require('./plugins/plugin-system');
const logger = require('./utils/logger');
const effectsRegistry = require('./effects/index'); // exposes effect helpers

// Main object exported by module
const webpoop = {
  plugins: new PluginSystem(),

  // Register plugin
  use(plugin) {
    this.plugins.use(plugin);
    return this;
  },

  // The main generate function (Auto Meme Mode)
  async generate(opts = {}) {
    const options = Object.assign({
      sources: ['./media'],
      output: './output/final.mp4',
      duration: 60,
      chaosLevel: 5, // 0..10
      resolution: '1280x720',
      fps: 24,
      effects: ['datamosh', 'reverse', 'pitch', 'overlay'],
      verbose: true,
      tmpPrefix: 'webpoop_',
    }, opts);

    logger.setVerbose(options.verbose);
    logger.info('WebPoop: starting generation');

    // 1) Scan inputs
    logger.step('Scanning sources...');
    const scanner = new InputScanner();
    const files = await scanner.scan(Array.isArray(options.sources) ? options.sources : [options.sources]);

    // 2) Build media pool
    logger.step('Building media pool...');
    const pool = new MediaPool();
    pool.addFiles(files);

    // 3) Initialize ffmpeg
    logger.step('Initializing ffmpeg...');
    const ff = new FFmpegRunner();
    await ff.init(); // loads ffmpeg.wasm

    // 4) Build timeline
    logger.step('Building timeline...');
    const timelineEngine = new TimelineEngine({ chaosLevel: options.chaosLevel, effects: options.effects, duration: options.duration, fps: options.fps, resolution: options.resolution });
    const timeline = timelineEngine.buildTimeline(pool);

    // 5) Allow plugins to modify timeline
    this.plugins.applyHooks('timeline:built', { timeline, pool, options });

    // 6) Render timeline clips to intermediate segments with effects
    logger.step('Rendering clips...');
    const renderedSegments = [];
    for (let i = 0; i < timeline.length; i++) {
      const clip = timeline[i];
      logger.info(`Rendering clip ${i + 1}/${timeline.length} (${clip.type || 'video'})`);
      // prepare input file into ffmpeg FS
      const inputPath = await ff.writeInputFile(clip.source.path);
      // build ffmpeg args for this clip
      const args = ff.buildClipCommand({
        input: inputPath,
        start: clip.start,
        duration: clip.duration,
        filters: clip.filters || [],
        audioFilters: clip.audioFilters || [],
        resolution: options.resolution,
        fps: options.fps,
        tmpPrefix: options.tmpPrefix,
        index: i
      });
      // run and get output filename
      const out = await ff.runClip(args, `${options.tmpPrefix}seg_${i}.mp4`);
      renderedSegments.push(out);
    }

    // 7) Concatenate all rendered segments into final output
    logger.step('Concatenating final video...');
    const finalFile = path.resolve(options.output);
    await ff.concatSegments(renderedSegments, finalFile, { resolution: options.resolution, fps: options.fps });

    // 8) Allow plugins to post-process output
    this.plugins.applyHooks('output:created', { output: finalFile, options });

    logger.success(`WebPoop: finished. Output: ${finalFile}`);
    return finalFile;
  }
};

module.exports = webpoop;