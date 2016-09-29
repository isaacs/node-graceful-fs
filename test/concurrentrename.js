'use strict'

var fs = require('../')
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')
var test = require('tap').test
var p = require('path').resolve(__dirname, 'files')

process.chdir(__dirname)

// Make sure to reserve the stderr fd
process.stderr.write('')

var num = 1025
var paths = new Array(num)

test('prepare files', function (t) {
  rimraf.sync(p)
  mkdirp.sync(p)

  t.plan(num + 1)
  for (var i = 0; i < num; ++i) {
    paths[i] = 'files/file-' + i
    fs.writeFile(paths[i], 'content-rename-' + i, 'ascii', function (er) {
      if (er)
        throw er
      t.pass('written')
    })
  }
  fs.writeFile('files/file', 'initial', 'ascii', function (er) {
    if (er)
      throw er
    t.pass('written')
  })
})

test('read and replace files', function (t) {
  t.plan(num * 4)
  var queue = []
  function CB (er) {
    if (er)
      throw er
    t.pass('renamed')
  }
  for (var i = 0; i < num; ++i) {
    (function (i) {
      queue.push(function () { fs.readFile('files/file', 'ascii', CB) })
      queue.push(function () { fs.writeFile('files/file', 'write-' + i, 'ascii', CB) })
      queue.push(function () { fs.appendFile('files/file', 'append-' + i, 'ascii', CB) })
      queue.push(function () { fs.rename(paths[i], 'files/file', CB) })
    })(i)
  }
  function swap (arr, a, b) {
    var tmp = arr[a]
    arr[a] = arr[b]
    arr[b] = tmp
  }
  for (var i = queue.length; i >= 2; --i) {
    swap(queue, i - 1, Math.floor(Math.random() * i))
  }
  for (var i = 0; i < queue.length; ++i) {
    queue[i]()
  }
})

test('confirm renames', function (t) {
  t.plan(num)
  for (var i = 0; i < num; ++i) {
    if (fs.access) {
      fs.access(paths[i], function (er) {
        t.equal(er.code, 'ENOENT', 'was renamed')
      })
    } else {
      fs.exists(paths[i], function (exists) {
        t.notOk(exists, 'was renamed')
      })
    }
  }
})

test('cleanup', function (t) {
  rimraf.sync(p)
  t.end()
})
