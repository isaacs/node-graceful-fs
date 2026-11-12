var fs = require('fs')
var path = require('path')
var test = require('tap').test

var gfsPath = path.resolve(__dirname, '..', 'graceful-fs.js')
var queueSymbol = Symbol.for('graceful-fs.queue')

function patched (fn) {
  return /graceful-fs shared queue/.test(Function.prototype.toString.call(fn))
}

function probe () {
  Object.preventExtensions(fs)
  var gfs = require(gfsPath)
  return {
    close: patched(fs.close),
    closeSync: patched(fs.closeSync),
    gfsClose: patched(gfs.close),
    gfsCloseSync: patched(gfs.closeSync),
    fsHasSymbol: fs[queueSymbol] !== undefined,
    globalQueue: Array.isArray(global[queueSymbol])
  }
}

function assertResult (t, msg) {
  t.equal(msg.close, true, 'patch fs.close')
  t.equal(msg.closeSync, true, 'patch fs.closeSync')
  t.equal(msg.gfsClose, true, 'patch gfs.close')
  t.equal(msg.gfsCloseSync, true, 'patch gfs.closeSync')
  t.equal(msg.fsHasSymbol, false, 'fs cannot store the symbol')
  t.equal(msg.globalQueue, true, 'shared queue')
}

test('queue installs when fs is not extensible', function (t) {
  // nyc's own dependency publishes the symbol before this file runs.
  // A worker with a clean execArgv still loads this copy of graceful-fs.
  if (!fs[queueSymbol]) {
    assertResult(t, probe())
    t.end()
    return
  }

  var Worker = require('worker_threads').Worker
  var source = [
    'var fs = require("fs")',
    'var wt = require("worker_threads")',
    'Object.preventExtensions(fs)',
    'var gfs = require(' + JSON.stringify(gfsPath) + ')',
    'var queueSymbol = Symbol.for("graceful-fs.queue")',
    'function patched (fn) {',
    '  return /graceful-fs shared queue/.test(Function.prototype.toString.call(fn))',
    '}',
    'wt.parentPort.postMessage({',
    '  close: patched(fs.close),',
    '  closeSync: patched(fs.closeSync),',
    '  gfsClose: patched(gfs.close),',
    '  gfsCloseSync: patched(gfs.closeSync),',
    '  fsHasSymbol: fs[queueSymbol] !== undefined,',
    '  globalQueue: Array.isArray(global[queueSymbol])',
    '})'
  ].join('\n')
  var env = {}
  var key
  for (key in process.env) env[key] = process.env[key]
  delete env.NODE_OPTIONS
  var worker = new Worker(source, { eval: true, execArgv: [], env: env })
  worker.on('message', function (msg) {
    assertResult(t, msg)
    t.end()
  })
  worker.on('error', function (err) {
    t.error(err)
    t.end()
  })
})
