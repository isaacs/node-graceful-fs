var fs = require('fs')
var path = require('path')
var gfs = require('./helpers/graceful-fs.js')
var importFresh = require('import-fresh')
var fs$close = fs.close
var fs$closeSync = fs.closeSync
var test = require('tap').test

var gfsPath = path.resolve(__dirname, '..', 'graceful-fs.js')

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

test('close error', t => {
  /* Open and close an fd to test fs.close / fs.closeSync errors */
  const fd = fs.openSync(__filename, 'r')
  gfs.closeSync(fd)

  t.throws(() => gfs.closeSync(fd), { code: 'EBADF' })
  gfs.close(fd, err => {
    t.ok(err && err.code === 'EBADF')
    t.end()
  })
})
