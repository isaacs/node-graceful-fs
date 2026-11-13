var fs = require('fs')
var gfs = require('../graceful-fs.js')
var test = require('tap').test

test('graceful fs uses same stats constructor as fs', function (t) {
  t.equal(gfs.Stats, fs.Stats, 'should reference the same constructor')
  t.ok(fs.statSync(__filename) instanceof fs.Stats,
    'should be instance of fs.Stats (built-in fs.statSync call)')
  t.ok(gfs.statSync(__filename) instanceof fs.Stats,
    'should be instance of fs.Stats')
  t.end()
})

test('graceful fs uses same stats constructor as fs (async)', function (t) {
  gfs.stat(__filename, function (er, stats) {
    t.notOk(er, 'should not receive an error result')
    t.ok(stats, 'should receive a valid stats object')
    t.ok(stats instanceof fs.Stats, 'should receive a valid stats object')
    t.end()
  })
})
