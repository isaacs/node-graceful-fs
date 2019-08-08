'use strict'

const path = require('path')
const fs = require('./helpers/graceful-fs.js')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')
const {test} = require('tap')

const p = path.resolve(__dirname, 'files-read-write-stream')

// Make sure to reserve the stderr fd
process.stderr.write('')

const paths = new Array(4097).fill().map((_, i) => `${p}/file-${i}`)

test('write files', t => {
  rimraf.sync(p)
  mkdirp.sync(p)

  t.plan(paths.length * 2)
  for (const i in paths) {
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
    stream.on('finish', () => t.pass('success'))
    stream.write('content')
    stream.end()
  }
})

test('read files', t => {
  // now read them
  t.plan(paths.length * 2)
  for (const i in paths) {
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
    let data = ''
    stream.on('data', c => {
      data += c
    })
    stream.on('end', () => t.equal(data, 'content'))
  }
})

function streamErrors (t, read, autoClose) {
  const events = []
  const initializer = read ? 'createReadStream' : 'createWriteStream'
  const stream = fs[initializer](
    path.join(__dirname, 'this dir does not exist', 'filename'),
    {autoClose}
  )
  const matchDestroy = autoClose ? ['destroy'] : ['error', 'destroy']
  const matchError = autoClose ? ['destroy', 'error'] : ['error']
  const {destroy} = stream
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
    constructor (...args) {
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
    constructor (...args) {
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

test('cleanup', t => {
  rimraf.sync(p)
  t.end()
})
