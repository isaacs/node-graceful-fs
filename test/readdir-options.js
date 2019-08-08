'use strict'

const fs = require('fs')
const t = require('tap')

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

let failed = false
fs.readdir = (path, options, cb) => {
  if (!failed) {
    // simulate an EMFILE and then open and close a thing to retry
    failed = true
    process.nextTick(() => {
      cb(Object.assign(new Error('synthetic emfile'), {code: 'EMFILE'}))
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

const g = require('./helpers/graceful-fs.js')

const encodings = ['buffer', 'hex', 'utf8', null]
encodings.forEach(encoding => {
  t.test('encoding=' + encoding, t => {
    currentTest = t
    g.readdir('whatevers', {encoding}, (er, files) => {
      t.error(er)
      t.same(files, getRet(encoding).sort())
      t.end()
    })
  })
})
