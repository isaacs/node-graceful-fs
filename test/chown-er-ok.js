'use strict'

const realFs = require('fs')
const {promisify} = require('util')

// This test depends on chown-er-filter.js not seeing us as root.
process.getuid = () => 1000;

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

  if (realFs.promises && !method.startsWith('f')) {
    realFs.promises[method] = async path => {
      throw makeErr(path, method)
    }
  }
})

function makeErr (path, method) {
  return Object.assign(new Error('this is fine'), {
    syscall: method.replace(/Sync$/, ''),
    code: path.toUpperCase()
  })
}

const fs = require('./helpers/graceful-fs.js')
const filehandlePromisesFileHandle = require('./helpers/promises.js')
const {test} = require('tap')

const errs = ['ENOSYS', 'EINVAL', 'EPERM']

async function helper (t, err, method) {
  const args = [err]
  if (/chmod/.test(method)) {
    args.push('some mode')
  } else {
    args.push('some uid', 'some gid')
  }

  t.doesNotThrow(() => fs[`${method}Sync`](...args), `${method}Sync does not throw ${err}`)
  await promisify(fs[method])(...args)
  if (fs.promises && !method.startsWith('f')) {
    await fs.promises[method](...args)
  }
}

errs.forEach(err => {
  methods.forEach(method => {
    test(`${method} ${err}`, t => helper(t, err, method))
  })
})

if (fs.promises) {
  test('FileHandle.chown / FileHandle.chmod', async t => {
    const filehandle = await fs.promises.open(__filename, 'r')
    const PromisesFileHandle = filehandlePromisesFileHandle(filehandle)
    ;['chmod', 'chown'].forEach(method => {
      PromisesFileHandle[method] = async path => {
        throw makeErr(path, method)
      }
    })

    for (const err of errs) {
      await filehandle.chmod(err, 'some mode')
      await filehandle.chown(err, 'some uid', 'some gid')
    }

    await filehandle.close()

    await t.rejects(
      filehandle.chmod('EBADF', 'some mode'),
      {code: 'EBADF'}
    )

    await t.rejects(
      filehandle.chown('EBADF', 'some uid', 'some gid'),
      {code: 'EBADF'}
    )
  })
}
