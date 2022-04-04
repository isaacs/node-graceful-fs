'use strict'

var fs = require('../')
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')
var test = require('tap').test
var p = require('path').resolve(__dirname, 'files')

process.chdir(__dirname)

// Make sure to reserve the stderr fd
process.stderr.write('')

var num = 4097
var paths = new Array(num)

test('write files', function (t) {
  rimraf.sync(p)
  mkdirp.sync(p)

  t.plan(num)
  for (var i = 0; i < num; ++i) {
    paths[i] = 'files/file-' + i
    var stream = fs.createWriteStream(paths[i])
    stream.on('finish', function () {
      t.pass('success')
    })
    stream.write('content')
    stream.end()
  }
})

test('read files', function (t) {
  // now read them
  t.plan(num)
  for (var i = 0; i < num; ++i) (function (i) {
    var stream = fs.createReadStream(paths[i])
    var data = ''
    stream.on('data', function (c) {
      data += c
    })
    stream.on('end', function () {
      t.equal(data, 'content')
    })
  })(i)
})

test('cleanup', function (t) {
  rimraf(p, function () {
    t.end()
  })
})
