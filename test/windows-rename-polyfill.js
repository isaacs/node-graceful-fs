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

t.test('cleanup', function (t) {
  try { fs.rmdirSync(a) } catch (e) {}
  try { fs.rmdirSync(b) } catch (e) {}
  t.end()
})
