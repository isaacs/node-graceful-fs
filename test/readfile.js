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
    fs.writeFile(paths[i], 'content', 'ascii', function (er) {
      if (er)
        throw er
      t.pass('written')
    })
  }
})

t.test('read files', function (t) {
  // now read them
  t.plan(num)
  for (var i = 0; i < num; ++i) {
    fs.readFile(paths[i], 'ascii', function (er, data) {
      if (er)
        throw er
      t.equal(data, 'content')
    })
  }
})
