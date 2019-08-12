'use strict'

const fs = require('fs')
const t = require('tap')
const {promisify} = require('util')

let currentTest

function getRet (encoding, withFileTypes) {
  const strings = ['b', 'z', 'a']
  const buffs = strings.map(s => Buffer.from(s))
  const hexes = buffs.map(b => b.toString('hex'))

  let results
  switch (encoding) {
    case 'hex':
      results = hexes
      break
    case 'buffer':
      results = buffs
      break
    default:
      results = strings
      break
  }

  if (withFileTypes) {
    return results.map(name => new fs.Dirent(name))
  }

  return results
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
    cb(null, getRet(options.encoding, options.withFileTypes))
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
    return getRet(options.encoding, options.withFileTypes)
  }
}

const g = require('./helpers/graceful-fs.js')

const sortDirEnts = (a, b) => a.name.toString().localeCompare(b.name.toString())
const encodings = ['buffer', 'hex', 'utf8', null]
encodings.forEach(encoding => {
  const readdir = promisify(g.readdir)
  t.test('encoding=' + encoding, async t => {
    currentTest = t
    let files = await readdir('whatevers', {encoding})
    t.same(files, getRet(encoding, false).sort())

    if (fs.Dirent) {
      files = await readdir('whatevers', {encoding, withFileTypes: true})
      t.same(files, getRet(encoding, true).sort(sortDirEnts))
    }

    if (g.promises) {
      files = await g.promises.readdir('whatevers', {encoding})
      t.same(files, getRet(encoding).sort())

      files = await g.promises.readdir('whatevers', {encoding, withFileTypes: true})
      t.same(files, getRet(encoding, true).sort(sortDirEnts))
    }
  })
})
