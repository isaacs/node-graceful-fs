'use strict'

const realFs = require('fs')

// For the fchown / fchmod do not accept `path` as the first parameter but
// gfs doesn't duplicate this check so we can still verify that the errors
// are ignored without added complexity in this test
const methods = ['chown', 'fchown', 'lchown', 'chmod', 'fchmod', 'lchmod']
methods.forEach(method => {
  realFs[`${method}Sync`] = path => {
    throw makeErr(path, `${method}Sync`)
  }

  realFs[method] = (path, ...args) => {
    const cb = args.pop()
    const err = makeErr(path, method)
    process.nextTick(() => cb(err))
  }
})

function makeErr (path, method) {
  return Object.assign(new Error('this is fine'), {
    syscall: method.replace(/Sync$/, ''),
    code: path.toUpperCase()
  })
}

const fs = require('./helpers/graceful-fs.js')
const t = require('tap')

const errs = ['ENOSYS', 'EINVAL', 'EPERM']
t.plan(errs.length * methods.length * 2)

errs.forEach(err => {
  methods.forEach(method => {
    const args = [err]
    if (/chmod/.test(method)) {
      args.push('some mode')
    } else {
      args.push('some uid', 'some gid')
    }

    t.doesNotThrow(() => fs[`${method}Sync`](...args), `${method}Sync does not throw ${err}`)
    args.push(e => t.notOk(e, `${method} does not throw ${err}`))
    fs[method](...args)
  })
})
