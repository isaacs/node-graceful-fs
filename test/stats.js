var test = require('tap').test
var fs = require('fs')
var gfs = require('../graceful-fs.js')

test('graceful fs uses same stats constructor as fs', function (t) {
  t.equal(gfs.Stats, fs.Stats, 'should reference the same constructor')
  t.ok(fs.statSync(__filename) instanceof fs.Stats,
    'should be instance of fs.Stats')
  t.ok(gfs.statSync(__filename) instanceof fs.Stats,
    'should be instance of fs.Stats')
  t.end()
})
