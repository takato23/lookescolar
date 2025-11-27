// Empty module stub for SSR replacement
// This replaces modules that should only run client-side
// All exports return null/empty values to prevent runtime errors

const noop = () => null;
const emptyObj = {};

module.exports = new Proxy(emptyObj, {
  get: function(target, prop) {
    if (prop === '__esModule') return true;
    if (prop === 'default') return emptyObj;
    return noop;
  }
});

module.exports.default = emptyObj;
module.exports.__esModule = true;
