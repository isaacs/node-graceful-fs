// eeeeeevvvvviiiiiiillllll
// more evil than monkey-patching the native builtin?
// Not sure.

var mod = require("module")
var pre = '(function (exports, require, module, __filename, __dirname) { '
var post = '});'
var src = pre + process.binding('natives').fs + post
var deprecation = ''

var printDeprecation = ['var prefix = \'(\' + [process.release.name, process.pid].join(\':\') + \')\';',
'var printDeprecation = function(msg, warned) {',
'  if (process.noDeprecation)',
'    return true;',
'  if (warned)',
'    return warned;',
'  if (process.throwDeprecation)',
'    throw new Error(prefix + msg);',
'  else if (process.traceDeprecation)',
'    console.trace(msg);',
'  else',
'    console.error(prefix + msg);',
'  return true;',
'};'].join('\n');

var deprecrationRequire = /const printDeprecation = require\(\'internal\/util\'\).printDeprecationMessage;/

src = src.replace(deprecrationRequire, printDeprecation);

var vm = require('vm')
var fn = vm.runInThisContext(src)
fn(exports, require, module, __filename, __dirname)
