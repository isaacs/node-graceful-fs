'use strict'

const path = require('path')
const fs = require('fs')
const windowsRenamePolyfill = require('../windows-rename-polyfill.js')

function createPolyfilledObject(code) {
  const pfs = {
    stat: fs.stat,
    rename(a, b, cb) {
      /* original rename */
      cb(Object.assign(new Error(code), {code}))
    }
  }

  windowsRenamePolyfill(pfs)

  return pfs
}

const t = require('tap')
const a = path.join(__dirname, 'a')
const b = path.join(__dirname, 'b')
const c = path.join(__dirname, 'c')

t.test('setup', t => {
  const pfs = createPolyfilledObject('EPERM')
  t.notMatch(pfs.rename.toString(), /original rename/)

  try {
    fs.mkdirSync(a)
  } catch (e) {}

  try {
    fs.mkdirSync(b)
  } catch (e) {}

  t.end()
})

t.test('rename EPERM', { timeout: 100 }, t => {
  t.plan(2)

  const pfs = createPolyfilledObject('EPERM')
  pfs.rename(a, b, er => {
    t.ok(er)
    t.is(er.code, 'EPERM')
  })
})

t.test('rename EACCES', { timeout: 100 }, t => {
  t.plan(2)

  const pfs = createPolyfilledObject('EACCES')
  pfs.rename(a, b, er => {
    t.ok(er)
    t.is(er.code, 'EACCES')
  })
})

t.test('rename ENOENT', { timeout: 100 }, t => {
  t.plan(2)

  const pfs = createPolyfilledObject('ENOENT')
  pfs.rename(a, b, er => {
    t.ok(er)
    t.is(er.code, 'ENOENT')
  })
})

t.test('rename EPERM then stat ENOENT', { timeout: 2000 }, t => {
  t.plan(3)

  const pfs = createPolyfilledObject('EPERM')
  let enoent = 12
  pfs.stat = (p, cb) => {
    if (--enoent) {
      cb(Object.assign(new Error('ENOENT'), {code: 'ENOENT'}))
    } else {
      fs.stat(p, cb)
    }
  }

  pfs.rename(a, b, er => {
    t.notOk(enoent)
    t.ok(er)
    t.is(er.code, 'EPERM')
  })
})

t.test('cleanup', function (t) {
  try { fs.rmdirSync(a) } catch (e) {}
  try { fs.rmdirSync(b) } catch (e) {}
  t.end()
})
