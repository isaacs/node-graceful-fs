'use strict'

var fs = require('./helpers/graceful-fs.js')
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')
var test = require('tap').test
var path = require('path')
var p = path.resolve(__dirname, 'files')

process.chdir(__dirname)

// Make sure to reserve the stderr fd
process.stderr.write('')

var num = 4097
var paths = new Array(num)

test('write files', function (t) {
  rimraf.sync(p)
  mkdirp.sync(p)

  t.plan(num * 2)
  for (var i = 0; i < num; ++i) {
    paths[i] = 'files/file-' + i
    let stream
    switch (i % 3) {
      case 0:
        stream = fs.createWriteStream(paths[i])
        break
      case 1:
        stream = fs.WriteStream(paths[i])
        break
      case 2:
        stream = new fs.WriteStream(paths[i])
        break
    }
    t.type(stream, fs.WriteStream)
    stream.on('finish', function () {
      t.pass('success')
    })
    stream.write('content')
    stream.end()
  }
})

test('read files', function (t) {
  // now read them
  t.plan(num * 2)
  for (var i = 0; i < num; ++i) (function (i) {
    let stream
    switch (i % 3) {
      case 0:
        stream = fs.createReadStream(paths[i])
        break
      case 1:
        stream = fs.ReadStream(paths[i])
        break
      case 2:
        stream = new fs.ReadStream(paths[i])
        break
    }
    t.type(stream, fs.ReadStream)
    var data = ''
    stream.on('data', function (c) {
      data += c
    })
    stream.on('end', function () {
      t.equal(data, 'content')
    })
  })(i)
})

function streamErrors(t, read, autoClose) {
  const events = []
  const initializer = read ? 'createReadStream' : 'createWriteStream'
  const stream = fs[initializer](
    path.join(__dirname, 'this dir does not exist', 'filename'),
    {autoClose}
  )
  const matchDestroy = autoClose ? ['destroy'] : ['error', 'destroy']
  const matchError = autoClose ? ['destroy', 'error'] : ['error']
  const destroy = stream.destroy
  stream.destroy = () => {
    events.push('destroy')
    t.deepEqual(events, matchDestroy, 'got destroy')
    destroy.call(stream)
  }

  stream.on('error', () => {
    events.push('error')
    t.deepEqual(events, matchError, 'got error')
    if (!autoClose) {
      stream.destroy()
    }

    setTimeout(() => t.end(), 50)
  })
}

test('read error autoClose', t => streamErrors(t, true, true))
test('read error no autoClose', t => streamErrors(t, true, false))
test('write error autoClose', t => streamErrors(t, false, true))
test('write error no autoClose', t => streamErrors(t, false, false))

test('ReadStream replacement', t => {
  const testArgs = [__filename, {}]
  let called = 0

  class FakeReplacement {
    constructor(...args) {
      t.deepEqual(args, testArgs)
      called++
    }
  }

  const {ReadStream} = fs
  fs.ReadStream = FakeReplacement
  const rs = fs.createReadStream(...testArgs)
  fs.ReadStream = ReadStream
  t.type(rs, FakeReplacement)
  t.is(called, 1)
  t.end()
})

test('WriteStream replacement', t => {
  const testArgs = [__filename, {}]
  let called = 0

  class FakeReplacement {
    constructor(...args) {
      t.deepEqual(args, testArgs)
      called++
    }
  }

  const {WriteStream} = fs
  fs.WriteStream = FakeReplacement
  const rs = fs.createWriteStream(...testArgs)
  fs.WriteStream = WriteStream
  t.type(rs, FakeReplacement)
  t.is(called, 1)
  t.end()
})

test('cleanup', function (t) {
  rimraf.sync(p)
  t.end()
})
