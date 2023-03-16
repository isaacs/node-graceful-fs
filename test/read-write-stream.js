'use strict'

var fs = require('../')
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')
var t = require('tap')

var td = t.testdir({
  files: {}
})
var p = require('path').resolve(td, 'files')

process.chdir(td)

// Make sure to reserve the stderr fd
process.stderr.write('')

var num = 4097
var paths = new Array(num)

t.test('write files', function (t) {
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

t.test('read files', function (t) {
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
