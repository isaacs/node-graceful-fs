'use strict'

var importFresh = require('import-fresh')
var path = require('path')
var realFs = require('fs')
var test = require('tap').test

var EMFILE = Object.assign(new Error('FAKE EMFILE'), { code: 'EMFILE' })

test('retries 10 times before erroring', function (t) {
  var attempts = 0
  realFs.readFile = function (path, options, cb) {
    ++attempts
    process.nextTick(cb, EMFILE)
  }
  var fs = importFresh(path.dirname(__dirname))

  fs.readFile('literally anything', function (err) {
    t.equal(err.code, 'EMFILE', 'eventually got the EMFILE')
    t.equal(attempts, 10, 'tried 10 times')
    t.done()
  })
})
