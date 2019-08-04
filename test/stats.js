var fs = require('fs')
var util = require('util')
var gfs = require('../graceful-fs.js')
var test = require('tap').test

test('graceful fs uses same stats constructor as fs', function (t) {
  t.equal(gfs.Stats, fs.Stats, 'should reference the same constructor')
  t.ok(fs.statSync(__filename) instanceof fs.Stats,
    'should be instance of fs.Stats')
  t.ok(gfs.statSync(__filename) instanceof fs.Stats,
    'should be instance of fs.Stats')
  t.end()
})

test('graceful fs promises.stat', { skip: !util.promisify }, function (t) {
  gfs.promises.stat(__filename)
    .then(function (stat) {
      t.ok(stat instanceof fs.Stats)
      t.end()
    })
    .catch(function (error) {
      t.error(error)
      t.end()
    })
})
