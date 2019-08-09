'use strict'

const fs = require('fs')
const t = require('tap')
const {promisify} = require('util')

let currentTest

const strings = ['b', 'z', 'a']
const buffs = strings.map(s => Buffer.from(s))
const hexes = buffs.map(b => b.toString('hex'))

function getRet (encoding) {
  switch (encoding) {
    case 'hex':
      return hexes
    case 'buffer':
      return buffs
    default:
      return strings
  }
}

const emfile = () => Object.assign(new Error('synthetic emfile'), {code: 'EMFILE'})
let failed = false
fs.readdir = (path, options, cb) => {
  if (!failed) {
    // simulate an EMFILE and then open and close a thing to retry
    failed = true
    process.nextTick(() => {
      cb(emfile())
      process.nextTick(() => {
        g.closeSync(fs.openSync(__filename, 'r'))
      })
    })
    return
  }

  failed = false
  currentTest.isa(cb, 'function')
  currentTest.isa(options, 'object')
  currentTest.ok(options)
  process.nextTick(() => {
    cb(null, getRet(options.encoding))
  })
}

if (fs.promises) {
  fs.promises.readdir = async (path, options) => {
    if (!failed) {
      // simulate an EMFILE and then open and close a thing to retry
      failed = true
      process.nextTick(() => {
        g.closeSync(fs.openSync(__filename, 'r'))
      })
      throw emfile()
    }

    failed = false
    currentTest.isa(options, 'object')
    currentTest.ok(options)
    return getRet(options.encoding)
  }
}

const g = require('./helpers/graceful-fs.js')

const encodings = ['buffer', 'hex', 'utf8', null]
encodings.forEach(encoding => {
  const readdir = promisify(g.readdir)
  t.test('encoding=' + encoding, async t => {
    currentTest = t
    let files = await readdir('whatevers', {encoding})
    t.same(files, getRet(encoding).sort())

    if (g.promises) {
      files = await g.promises.readdir('whatevers', {encoding})
      t.same(files, getRet(encoding).sort())
    }
  })
})
