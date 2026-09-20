'use strict'

// Regression for https://github.com/isaacs/node-graceful-fs/issues/245
//
// In ESM, `import * as fs from 'node:fs'` is a non-extensible namespace
// object. graceful-fs used to throw:
//   TypeError: Cannot define property Symbol(graceful-fs.queue), object is not extensible
//
// This test simulates that by Object.preventExtensions on the CJS fs
// export (methods stay writable, which isolates #245 from getter-only
// close assignment). Global-patch mode is skipped because that path
// assigns `fs.__patched`, a new property.

if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH) {
  require('tap').plan(0, 'non-extensible fs coverage is for the default export path')
  process.exit(0)
}

var fs = require('fs')
var path = require('path')
var importFresh = require('import-fresh')
var test = require('tap').test

var gfsPath = path.resolve(__dirname, '..', 'graceful-fs.js')
var queueSymbol = typeof Symbol === 'function' && typeof Symbol.for === 'function'
  ? Symbol.for('graceful-fs.queue')
  : '___graceful-fs.queue'

test('precondition: CJS fs starts extensible', function (t) {
  t.equal(Object.isExtensible(fs), true)
  t.end()
})

test('loading must not throw when fs is not extensible', function (t) {
  Object.preventExtensions(fs)
  t.equal(Object.isExtensible(fs), false)

  var gfs
  t.doesNotThrow(function () {
    gfs = require(gfsPath)
  }, 'require(graceful-fs) does not throw')

  t.type(gfs.readFile, 'function')
  t.type(gfs.openSync, 'function')
  t.type(gfs.closeSync, 'function')

  t.equal(fs[queueSymbol], undefined,
    'does not define the queue Symbol on a non-extensible fs')
  t.ok(Array.isArray(global[queueSymbol]),
    'queue is stored off fs (on global) so copies can still share it')

  var fd = gfs.openSync(__filename, 'r')
  gfs.closeSync(fd)

  gfs.readFile(__filename, 'utf8', function (err, data) {
    t.error(err, 'readFile still works')
    t.match(data, /not extensible/)
    t.end()
  })
})

test('import-fresh copies share the same queue via global', function (t) {
  var q1 = global[queueSymbol]
  t.ok(Array.isArray(q1))

  var gfs2 = importFresh(gfsPath)
  t.type(gfs2.readFile, 'function')
  t.equal(global[queueSymbol], q1,
    'second load keeps the shared queue instance')
  t.equal(fs[queueSymbol], undefined)
  t.end()
})

test('EMFILE retries use the off-fs queue', function (t) {
  var readFile = fs.readFile
  var realNow = Date.now
  var EMFILE = Object.assign(new Error('FAKE EMFILE'), { code: 'EMFILE' })

  t.teardown(function () {
    fs.readFile = readFile
    Date.now = realNow
  })

  fs.readFile = function (p, options, cb) {
    process.nextTick(function () {
      cb(EMFILE)
      Date.now = function () {
        return realNow() + 60000
      }
    })
  }

  var gfs = importFresh(gfsPath)
  gfs.readFile('literally anything', function (err) {
    t.equal(err.code, 'EMFILE', 'eventually got the EMFILE from the shared queue')
    t.end()
  })
})
