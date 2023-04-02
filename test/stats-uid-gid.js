'use strict';
var util = require('util')
var fs = require('fs')
var test = require('tap').test

// mock fs.statSync to return signed uids/gids
var realStatSync = fs.statSync
fs.statSync = function(path) {
  var stats = realStatSync.call(fs, path)
  stats.uid = -2
  stats.gid = -2
  return stats
}

var gfs = require('../graceful-fs.js')

test('graceful fs includes correct uid & gid', function (t) {
  if (!process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH) {
    t.equal(fs.statSync(__filename).uid, -2)
    t.equal(fs.statSync(__filename).gid, -2)
  }

  t.equal(gfs.statSync(__filename).uid, 0xfffffffe)
  t.equal(gfs.statSync(__filename).gid, 0xfffffffe)

  t.end()
})

;(process.platform !== 'win32') && test('graceful fs includes valid uid & gid (async)', function (t) {
  gfs.stat(__filename, function (er, stats) {
    t.notOk(er)
    t.ok(stats)
    t.ok(stats.uid)
    t.ok(stats.gid)
    t.end()
  })
})

test('does not throw when async stat fails', function (t) {
  gfs.stat(__filename + ' this does not exist', function (er, stats) {
    t.ok(er)
    t.notOk(stats)
    t.end()
  })
})

test('throws ENOENT when sync stat fails', function (t) {
  t.throws(function() {
    gfs.statSync(__filename + ' this does not exist')
  }, /ENOENT/)
  t.end()
})
