'use strict'

const path = require('path')
const fs = require('fs')
const {promisify} = require('util')

const windowsRenamePolyfill = require('../windows-rename-polyfill.js')
const promiseWindowsRenamePolyfill = require('../promise-windows-rename-polyfill.js')

function createPolyfilledObject (code) {
  const pfs = {
    stat: fs.stat,
    rename (a, b, cb) {
      /* original rename */
      cb(Object.assign(new Error(code), {code}))
    }
  }

  windowsRenamePolyfill(pfs)
  if (fs.promises) {
    pfs.promises = {
      stat: fs.promises.stat,
      async rename (a, b) {
        /* original rename */
        throw Object.assign(new Error(code), {code})
      }
    }

    promiseWindowsRenamePolyfill(pfs.promises)
  }

  return pfs
}

const t = require('tap')

const a = path.join(__dirname, 'a')
const b = path.join(__dirname, 'b')

t.test('setup', t => {
  const pfs = createPolyfilledObject('EPERM')
  t.notMatch(pfs.rename.toString(), /original rename/)
  if (pfs.promises) {
    t.notMatch(pfs.promises.rename.toString(), /original rename/)
  }

  try {
    fs.mkdirSync(a)
  } catch (e) {}

  try {
    fs.mkdirSync(b)
  } catch (e) {}

  t.end()
})

t.test('rename EPERM', {timeout: 100}, async t => {
  const pfs = createPolyfilledObject('EPERM')
  console.log('orig rename')
  await t.rejects(promisify(pfs.rename)(a, b), {code: 'EPERM'})

  if (pfs.promises) {
    console.log('promise rename')
    await t.rejects(pfs.promises.rename(a, b), {code: 'EPERM'})
  }
})

t.test('rename EACCES', {timeout: 100}, async t => {
  const pfs = createPolyfilledObject('EACCES')
  await t.rejects(promisify(pfs.rename)(a, b), {code: 'EACCES'})

  if (pfs.promises) {
    await t.rejects(pfs.promises.rename(a, b), {code: 'EACCES'})
  }
})

t.test('rename ENOENT', {timeout: 100}, async t => {
  const pfs = createPolyfilledObject('ENOENT')
  await t.rejects(promisify(pfs.rename)(a, b), {code: 'ENOENT'})

  if (pfs.promises) {
    await t.rejects(pfs.promises.rename(a, b), {code: 'ENOENT'})
  }
})

t.test('rename EPERM then stat ENOENT', {timeout: 2000}, async t => {
  const pfs = createPolyfilledObject('EPERM')
  let enoent = 12
  pfs.stat = (p, cb) => {
    if (--enoent) {
      cb(Object.assign(new Error('ENOENT'), {code: 'ENOENT'}))
    } else {
      fs.stat(p, cb)
    }
  }

  await t.rejects(promisify(pfs.rename)(a, b), {code: 'EPERM'})

  if (pfs.promises) {
    enoent = 12
    pfs.promises.stat = async p => {
      if (--enoent) {
        throw Object.assign(new Error('ENOENT'), {code: 'ENOENT'})
      }

      return fs.promises.stat(p)
    }

    await t.rejects(pfs.promises.rename(a, b), {code: 'EPERM'})
  }
})

t.test('rename EPERM then stat EACCES', {timeout: 2000}, async t => {
  const pfs = createPolyfilledObject('EPERM')
  pfs.stat = (p, cb) => {
    cb(Object.assign(new Error('EACCES'), {code: 'EACCES'}))
  }

  await t.rejects(promisify(pfs.rename)(a, b), {code: 'EPERM'})

  if (pfs.promises) {
    pfs.promises.stat = async p => {
      throw Object.assign(new Error('EACCES'), {code: 'EACCES'})
    }

    await t.rejects(pfs.promises.rename(a, b), {code: 'EPERM'})
  }
})

t.test('cleanup', t => {
  try {
    fs.rmdirSync(a)
  } catch (e) {}

  try {
    fs.rmdirSync(b)
  } catch (e) {}

  t.end()
})
