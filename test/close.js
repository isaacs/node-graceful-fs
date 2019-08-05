var fs = require('fs')
var path = require('path')
var gfsPath = path.resolve(__dirname, '..', 'graceful-fs.js')
var gfs = require(gfsPath)
var importFresh = require('import-fresh')
var fs$close = fs.close
var fs$closeSync = fs.closeSync
var test = require('tap').test

test('`close` is patched correctly', function(t) {
  t.match(fs$close.toString(), /graceful-fs shared queue/, 'patch fs.close');
  t.match(fs$closeSync.toString(), /graceful-fs shared queue/, 'patch fs.closeSync');
  t.match(gfs.close.toString(), /graceful-fs shared queue/, 'patch gfs.close');
  t.match(gfs.closeSync.toString(), /graceful-fs shared queue/, 'patch gfs.closeSync');

  var newGFS = importFresh(gfsPath)
  t.equal(fs.close, fs$close)
  t.equal(fs.closeSync, fs$closeSync)
  t.equal(newGFS.close, fs$close)
  t.equal(newGFS.closeSync, fs$closeSync)
  t.end();
})
