'use strict'

// Regression for https://github.com/isaacs/node-graceful-fs/issues/245
//
// In ESM, `import * as fs from 'node:fs'` is a non-extensible namespace
// object. graceful-fs used to throw:
//   TypeError: Cannot define property Symbol(graceful-fs.queue), object is not extensible
//
// nyc (via package-hash) preloads node_modules/graceful-fs onto the real
// `fs` before tests run, so we load *this* tree's graceful-fs.js against a
// cloned, Object.preventExtensions fs-like object instead.

var Module = require('module')
var path = require('path')
var clone = require('../clone.js')
var realFs = require('fs')
var test = require('tap').test

var filename = path.resolve(__dirname, '..', 'graceful-fs.js')
var queueSymbol = typeof Symbol === 'function' && typeof Symbol.for === 'function'
  ? Symbol.for('graceful-fs.queue')
  : '___graceful-fs.queue'

function loadGracefulFs (fakeFs) {
  var prev = process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH
  delete process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH

  var m = new Module(filename + '-non-extensible-' + Date.now() + '-' + Math.random(), module)
  m.filename = filename
  m.paths = Module._nodeModulePaths(path.dirname(filename))
  var protoRequire = Module.prototype.require
  m.require = function (request) {
    if (request === 'fs')
      return fakeFs
    return protoRequire.call(this, request)
  }

  try {
    m.load(filename)
    return m.exports
  } finally {
    if (prev !== undefined)
      process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH = prev
  }
}

function nonExtensibleFs () {
  var fakeFs = clone(realFs)
  Object.preventExtensions(fakeFs)
  return fakeFs
}

test('loading must not throw when fs is not extensible', function (t) {
  var fakeFs = nonExtensibleFs()
  t.equal(Object.isExtensible(fakeFs), false)

  var gfs
  t.doesNotThrow(function () {
    gfs = loadGracefulFs(fakeFs)
  }, 'loading graceful-fs does not throw')

  t.type(gfs.readFile, 'function')
  t.type(gfs.openSync, 'function')
  t.type(gfs.closeSync, 'function')

  t.equal(fakeFs[queueSymbol], undefined,
    'does not define the queue Symbol on a non-extensible fs')
  t.ok(Array.isArray(global[queueSymbol]),
    'queue is stored off fs (on global) so copies can still share it')

  var fd = gfs.openSync(filename, 'r')
  gfs.closeSync(fd)

  gfs.readFile(filename, 'utf8', function (err, data) {
    t.error(err, 'readFile still works')
    t.match(data, /not extensible/)
    t.end()
  })
})

test('later loads share the same queue via global', function (t) {
  var fakeFs = nonExtensibleFs()
  loadGracefulFs(fakeFs)
  var q1 = global[queueSymbol]
  t.ok(Array.isArray(q1))

  var gfs2 = loadGracefulFs(fakeFs)
  t.type(gfs2.readFile, 'function')
  t.equal(global[queueSymbol], q1,
    'second load keeps the shared queue instance')
  t.equal(fakeFs[queueSymbol], undefined)
  t.end()
})

test('EMFILE retries use the off-fs queue', function (t) {
  var realNow = Date.now
  var EMFILE = Object.assign(new Error('FAKE EMFILE'), { code: 'EMFILE' })
  var fakeFs = clone(realFs)

  t.teardown(function () {
    Date.now = realNow
  })

  fakeFs.readFile = function (p, options, cb) {
    process.nextTick(function () {
      cb(EMFILE)
      Date.now = function () {
        return realNow() + 60000
      }
    })
  }
  Object.preventExtensions(fakeFs)

  var gfs = loadGracefulFs(fakeFs)
  gfs.readFile('literally anything', function (err) {
    t.equal(err.code, 'EMFILE', 'eventually got the EMFILE from the shared queue')
    t.end()
  })
})
