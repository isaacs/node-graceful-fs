'use strict'

var importFresh = require('import-fresh')
var path = require('path')
var realFs = require('fs')
var test = require('tap').test

var EMFILE = Object.assign(new Error('FAKE EMFILE'), { code: 'EMFILE' })

test('eventually times out and returns error', function (t) {
  var readFile = realFs.readFile
  var realNow = Date.now

  t.teardown(function () {
    realFs.readFile = readFile
    Date.now = realNow
  })

  realFs.readFile = function (path, options, cb) {
    process.nextTick(function () {
      cb(EMFILE)
      // hijack Date.now _after_ we call the callback, the callback will
      // call it when adding the job to the queue, we want to capture it
      // any time after that first call so we can pretend it's been 60s
      Date.now = function () {
        return realNow() + 60000
      }
    })
  }

  var fs = importFresh(path.dirname(__dirname))
  fs.readFile('literally anything', function (err) {
    t.equal(err.code, 'EMFILE', 'eventually got the EMFILE')
    t.done()
  })
})
