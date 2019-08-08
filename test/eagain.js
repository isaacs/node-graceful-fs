'use strict'

const {test} = require('tap')

const eagain = () => Object.assign(new Error('EAGAIN'), {code: 'EAGAIN'})

let readPing
let readSyncPing
let cbArgs = []

// We can't hijack the actual `fs` module so we have to fake it
const fs = require('../graceful-fs.js').gracefulify({
  ...require('fs'),
  read (...args) {
    const cb = args.slice(-1)[0]
    readPing(args)

    cb(...cbArgs)
  },
  readSync (...args) {
    return readSyncPing(...args)
  }
})

test('read unresolved EAGAIN', t => {
  let counter = 0
  readPing = () => {
    counter++
  }
  cbArgs = [eagain()]

  fs.read(null, null, 0, 0, 0, err => {
    t.ok(err && err.code === 'EAGAIN', 'unresolved eagain')
    t.is(counter, 11)
    t.end()
  })
})

test('read EAGAIN loop', t => {
  let counter = 0

  cbArgs = [eagain()]
  readPing = () => {
    counter++
    if (counter === 5) {
      cbArgs = [null, 'success']
    }
  }

  fs.read(null, null, 0, 0, 0, (err, msg) => {
    t.is(counter, 5, 'retried 5 times')
    t.notOk(err)
    t.is(msg, 'success', 'resolved after retries')
    t.end()
  })
})

test('readSync unresolved EAGAIN', t => {
  let counter = 0
  readSyncPing = () => {
    counter++
    throw eagain()
  }

  t.throws(() => fs.readSync(), {code: 'EAGAIN'})
  t.is(counter, 11)
  t.end()
})

test('readSync unresolved EAGAIN', t => {
  let counter = 0
  readSyncPing = () => {
    counter++
    if (counter !== 5) {
      throw eagain()
    }

    return 'success'
  }

  t.is(fs.readSync(), 'success')
  t.is(counter, 5)
  t.end()
})
