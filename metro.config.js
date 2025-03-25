// Polyfill for os.availableParallelism which was added in Node.js 18.14.0/19.4
const os = require('os');
if (!os.availableParallelism) {
  os.availableParallelism = function() { 
    return Math.max(1, Math.min(4, os.cpus().length - 1)); 
  };
}

// Get the default Metro config
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Explicitly set maxWorkers to avoid using os.availableParallelism
config.maxWorkers = os.cpus().length - 1 || 1;

module.exports = config; 