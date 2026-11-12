var fs = require('fs')
var path = require('path')
var test = require('tap').test

var gfsPath = path.resolve(__dirname, '..', 'graceful-fs.js')
var closeDesc = Object.getOwnPropertyDescriptor(fs, 'close')
var closeSyncDesc = Object.getOwnPropertyDescriptor(fs, 'closeSync')

function getterOnly (fn) {
  return {
    configurable: true,
    enumerable: true,
    get: function () { return fn }
  }
}

Object.defineProperty(fs, 'close', getterOnly(fs.close))
Object.defineProperty(fs, 'closeSync', getterOnly(fs.closeSync))

var gfs = require(gfsPath)

test('close patch lands when close is a getter', function (t) {
  t.match(fs.close.toString(), /graceful-fs shared queue/, 'patch fs.close')
  t.match(fs.closeSync.toString(), /graceful-fs shared queue/, 'patch fs.closeSync')
  t.match(gfs.close.toString(), /graceful-fs shared queue/, 'patch gfs.close')
  t.match(gfs.closeSync.toString(), /graceful-fs shared queue/, 'patch gfs.closeSync')
  Object.defineProperty(fs, 'close', closeDesc)
  Object.defineProperty(fs, 'closeSync', closeSyncDesc)
  t.end()
})
