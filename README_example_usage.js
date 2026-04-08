// Example usage (save as a script to test the API).
// You must install @ffmpeg/ffmpeg and ensure your Node environment can load wasm.

const webpoop = require('./index');

(async () => {
  try {
    // Optional plugin example: log timeline length
    webpoop.use((sys) => {
      sys.on('timeline:built', ({ timeline }) => {
        console.log('Plugin: timeline length =', timeline.length);
      });
    });

    const output = await webpoop.generate({
      sources: ['./media'], // path to a folder containing videos/audio/images
      output: './output/final_webpoop.mp4',
      duration: 30,
      chaosLevel: 8,
      effects: ['datamosh', 'reverse', 'pitch', 'overlay'],
      fps: 24,
      resolution: '1280x720',
      verbose: true
    });

    console.log('Final output file:', output);
  } catch (err) {
    console.error('Generation failed:', err);
  }
})();