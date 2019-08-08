'use strict'

const path = require('path')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const {test} = require('tap')
const fs = require('./helpers/graceful-fs.js')

const dir = path.resolve(__dirname, 'files')
const ln = path.resolve(dir, 'symlink')

if (!('O_SYMLINK' in fs.constants)) {
  test('stubs', t => {
    fs.lutimes(ln, 0, 0, () => {})
    fs.lutimesSync(ln, 0, 0)
    t.end()
  })

  // nothing to test on this platform
  process.exit(0)
}

test('setup', t => {
  mkdirp.sync(dir)
  t.end()
})

test('lutimes', t => {
  fs.symlinkSync(__filename, ln)
  fs.lutimesSync(ln, 0, 0)

  let stat = fs.lstatSync(ln)
  t.is(stat.atimeMs, 0)
  t.is(stat.mtimeMs, 0)

  fs.lutimes(ln, 1, 1, er => {
    t.notOk(er)
    stat = fs.lstatSync(ln)
    t.is(stat.atimeMs, 1000)
    t.is(stat.mtimeMs, 1000)

    fs.unlinkSync(ln)
    t.end()
  })
})

test('futimes error', t => {
  const error = new Error('test error')

  fs.symlinkSync(__filename, ln)

  fs.futimes = (fd, at, mt, cb) => cb(error)
  fs.futimesSync = () => {
    throw error
  }

  t.throws(() => fs.lutimesSync(ln, 0, 0), error, 'futimesSync error')

  fs.lutimes(ln, 1, 1, er => {
    t.is(er, error)

    fs.unlinkSync(ln)
    t.end()
  })
})

test('lutimes open error', t => {
  fs.lutimes(ln, 1, 1, er => {
    t.match(er, {code: 'ENOENT'})

    t.end()
  })
})

test('cleanup', t => {
  rimraf.sync(dir)
  t.end()
})
