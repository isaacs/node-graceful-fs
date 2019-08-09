'use strict'

const {test} = require('tap')

const eagain = () => Object.assign(new Error('EAGAIN'), {code: 'EAGAIN'})

let readPing
let readSyncPing
let cbArgs = []

const filehandlePromisesFileHandle = require('./helpers/promises.js')

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

if (fs.promises) {
  test('promises read', async t => {
    t.ok(true)
    const filehandle = await fs.promises.open(__filename, 'r')
    let counter = 0
    const PromisesFileHandle = filehandlePromisesFileHandle(filehandle)
    PromisesFileHandle.read = async (...args) => {
      counter++
      throw eagain()
    }

    await t.rejects(
      filehandle.read(null, 0, 0, 0),
      {code: 'EAGAIN'},
      'unresolve eagain'
    )
    t.is(counter, 11)

    counter = 0
    PromisesFileHandle.read = async (...args) => {
      counter++
      if (counter !== 5) {
        throw eagain()
      }
    }

    await filehandle.read(null, 0, 0, 0)
    t.is(counter, 5, 'retried 5 times')
    await filehandle.close()
  })
}
