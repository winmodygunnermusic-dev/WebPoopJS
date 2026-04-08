// plugins/plugin-system.js
// Simple plugin system: plugins can register hooks and be executed.

const logger = require('../utils/logger');

class PluginSystem {
  constructor() {
    this.plugins = [];
    this.hooks = {}; // hookName -> [fn]
  }

  use(plugin) {
    if (typeof plugin === 'function') {
      plugin(this);
    } else if (plugin && typeof plugin.install === 'function') {
      plugin.install(this);
    } else {
      logger.warn('Unknown plugin format, expecting function or {install: fn}');
    }
    this.plugins.push(plugin);
  }

  on(hookName, fn) {
    if (!this.hooks[hookName]) this.hooks[hookName] = [];
    this.hooks[hookName].push(fn);
  }

  applyHooks(hookName, context) {
    const list = this.hooks[hookName] || [];
    for (const fn of list) {
      try {
        fn(context);
      } catch (err) {
        logger.warn(`Plugin hook ${hookName} failed: ${err.message}`);
      }
    }
  }
}

module.exports = PluginSystem;