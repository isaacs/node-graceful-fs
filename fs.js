// eeeeeevvvvviiiiiiillllll
// more evil than monkey-patching the native builtin?
// Not sure.

var pre = '(function (exports, require, module, __filename, __dirname) { '
var post = '});'
var src = pre + process.binding('natives').fs + post
var vm = require('vm')
var fn = vm.runInThisContext(src)
return fn(exports, require, module, __filename, __dirname)
