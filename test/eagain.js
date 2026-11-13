'use strict'

var importFresh = require('import-fresh')
var path = require('path')
var realFs = require('fs')
var test = require('tap').test

var EAGAIN = Object.assign(new Error('FAKE EAGAIN'), { code: 'EAGAIN' })

test('EAGAIN readFile is retried and eventually succeeds', function (t) {
  var readFile = realFs.readFile
  var eagainCount = 0

  t.teardown(function () {
    realFs.readFile = readFile
  })

  realFs.readFile = function (path, options, cb) {
    process.nextTick(function () {
      if (eagainCount < 3) {
        eagainCount++
        return cb(EAGAIN)
      }
      // succeed after 3 retries
      cb(null, Buffer.from('test content'))
    })
  }

  var fs = importFresh(path.dirname(__dirname))
  fs.readFile('literally anything', function (err, data) {
    t.notOk(err, 'should not get an error')
    t.equal(eagainCount, 3, 'should have retried 3 times')
    t.equal(data.toString(), 'test content', 'should get the content')
    t.end()
  })
})

test('EAGAIN eventually times out and returns error', function (t) {
  var readFile = realFs.readFile
  var realNow = Date.now

  t.teardown(function () {
    realFs.readFile = readFile
    Date.now = realNow
  })

  realFs.readFile = function (path, options, cb) {
    process.nextTick(function () {
      cb(EAGAIN)
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
    t.equal(err.code, 'EAGAIN', 'eventually got the EAGAIN')
    t.end()
  })
})

test('EAGAIN open is retried and eventually succeeds', function (t) {
  var open = realFs.open
  var eagainCount = 0

  t.teardown(function () {
    realFs.open = open
  })

  realFs.open = function (path, flags, mode, cb) {
    process.nextTick(function () {
      if (eagainCount < 2) {
        eagainCount++
        return cb(EAGAIN)
      }
      // succeed after 2 retries with a fake fd
      cb(null, 42)
    })
  }

  var fs = importFresh(path.dirname(__dirname))
  fs.open('literally anything', 'r', function (err, fd) {
    t.notOk(err, 'should not get an error')
    t.equal(eagainCount, 2, 'should have retried 2 times')
    t.equal(fd, 42, 'should get the fd')
    t.end()
  })
})

test('EAGAIN writeFile is retried and eventually succeeds', function (t) {
  var writeFile = realFs.writeFile
  var eagainCount = 0

  t.teardown(function () {
    realFs.writeFile = writeFile
  })

  realFs.writeFile = function (path, data, options, cb) {
    process.nextTick(function () {
      if (eagainCount < 2) {
        eagainCount++
        return cb(EAGAIN)
      }
      cb(null)
    })
  }

  var fs = importFresh(path.dirname(__dirname))
  fs.writeFile('literally anything', 'data', function (err) {
    t.notOk(err, 'should not get an error')
    t.equal(eagainCount, 2, 'should have retried 2 times')
    t.end()
  })
})
