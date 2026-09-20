var fs = require('fs')
var path = require('path')
var test = require('tap').test
var origClose = fs.close
var origCloseSync = fs.closeSync
var globalPatch = !!process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH
var self = path.resolve(__filename)

function defineGetterOnly (name, fn, configurable) {
  Object.defineProperty(fs, name, {
    get: function () { return fn },
    enumerable: true,
    configurable: configurable
  })
}

if (process.argv.indexOf('--nonconfig') !== -1) {
  defineGetterOnly('close', origClose, false)
  defineGetterOnly('closeSync', origCloseSync, false)

  test('non-configurable getter-only close does not throw', function (t) {
    var gfs
    t.doesNotThrow(function () {
      gfs = require('../')
    })
    t.equal(fs.close, origClose, 'real fs.close left unchanged')
    t.equal(fs.closeSync, origCloseSync, 'real fs.closeSync left unchanged')
    if (!globalPatch) {
      t.match(gfs.close.toString(), /graceful-fs shared queue/,
        'export close still patched')
      t.match(gfs.closeSync.toString(), /graceful-fs shared queue/,
        'export closeSync still patched')
    }
    t.end()
  })
} else {
  test('clone materializes getter-only properties as writable', function (t) {
    var clone = require('../clone.js')
    var src = {}
    var fn = function () { return 1 }
    Object.defineProperty(src, 'close', {
      get: function () { return fn },
      enumerable: true
    })
    var copy = clone(src)
    t.equal(copy.close, fn)
    var replacement = function () { return 2 }
    copy.close = replacement
    t.equal(copy.close, replacement, 'clone close is writable')
    t.end()
  })

  defineGetterOnly('close', origClose, true)
  defineGetterOnly('closeSync', origCloseSync, true)

  test('configurable getter-only close is patched', function (t) {
    var gfs = require('../')
    t.match(fs.close.toString(), /graceful-fs shared queue/, 'patch fs.close')
    t.match(fs.closeSync.toString(), /graceful-fs shared queue/,
      'patch fs.closeSync')
    t.match(gfs.close.toString(), /graceful-fs shared queue/, 'patch gfs.close')
    t.match(gfs.closeSync.toString(), /graceful-fs shared queue/,
      'patch gfs.closeSync')

    var fd = gfs.openSync(__filename, 'r')
    t.doesNotThrow(function () { gfs.closeSync(fd) }, 'patched closeSync works')
    gfs.open(__filename, 'r', function (er, fd2) {
      t.error(er)
      gfs.close(fd2, function (er2) {
        t.error(er2, 'patched close works')
        t.end()
      })
    })
  })

  test('non-configurable getter-only close', function (t) {
    var env = {}
    Object.keys(process.env).forEach(function (k) {
      env[k] = process.env[k]
    })
    t.spawn(process.execPath, [self, '--nonconfig'], { env: env })
    t.end()
  })
}
