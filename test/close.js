'use strict'

const fs = require('fs')
const path = require('path')
const importFresh = require('import-fresh')
const gfs = require('./helpers/graceful-fs.js')
const {test} = require('tap')

const {close, closeSync} = fs
const gfsPath = path.resolve(__dirname, '..', 'graceful-fs.js')

test('`close` is patched correctly', t => {
  t.match(close.toString(), /graceful-fs shared queue/, 'patch fs.close')
  t.match(closeSync.toString(), /graceful-fs shared queue/, 'patch fs.closeSync')
  t.match(gfs.close.toString(), /graceful-fs shared queue/, 'patch gfs.close')
  t.match(gfs.closeSync.toString(), /graceful-fs shared queue/, 'patch gfs.closeSync')

  const newGFS = importFresh(gfsPath)
  t.equal(fs.close, close)
  t.equal(fs.closeSync, closeSync)
  t.equal(newGFS.close, close)
  t.equal(newGFS.closeSync, closeSync)
  t.end()
})

test('close error', t => {
  /* Open and close an fd to test fs.close / fs.closeSync errors */
  const fd = fs.openSync(__filename, 'r')
  gfs.closeSync(fd)

  t.throws(() => gfs.closeSync(fd), {code: 'EBADF'})
  gfs.close(fd, err => {
    t.ok(err && err.code === 'EBADF')
    t.end()
  })
})
