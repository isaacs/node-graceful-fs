// eeeeeevvvvviiiiiiillllll
// more evil than monkey-patching the native builtin?
// Not sure.

var fs = require('fs')
var mod = require("module")
var pre = '(function (exports, require, module, __filename, __dirname) { '
var post = '});'
var src = pre + process.binding('natives').fs + post
var vm = require('vm')
var fn = vm.runInThisContext(src)
fn(exports, require, module, __filename, __dirname)

// fix reference to Stats constructor in node 0.11.13+
var binding = process.binding('fs')
if (binding.FSInitialize) {
  binding.FSInitialize(fs.Stats)
  module.exports.Stats = fs.Stats
}
