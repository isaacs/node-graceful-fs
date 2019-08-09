'use strict'

const normalizeArgs = require('./normalize-args.js')
const {noop, noopSync} = require('./noop.js')
const chownErFilter = require('./chown-er-filter.js')

function patchProcess () {
  if (/graceful-fs replacement/.test(process.cwd.toString())) {
    // Don't patch more than once
    return
  }

  const {cwd, chdir} = process
  let pwd = null

  process.cwd = () => {
    /* graceful-fs replacement */
    if (pwd === null) {
      pwd = cwd()
    }

    return pwd
  }

  process.chdir = dir => {
    pwd = null
    chdir(dir)
  }

  try {
    process.cwd()
  } catch (er) {}
}

patchProcess()

module.exports = patch

function patch (fs) {
  // (re-)implement some things that are known busted or missing.

  // lutimes implementation, or no-op
  if (!fs.lutimes) {
    require('./lutimes-polyfill.js')(fs)
  }

  // https://github.com/isaacs/node-graceful-fs/issues/4
  // Chown should not fail on einval or eperm if non-root.
  // It should not fail on enosys ever, as this just indicates
  // that a fs doesn't support the intended operation.

  fs.chown = patchChownErFilter(fs.chown)
  fs.fchown = patchChownErFilter(fs.fchown)
  fs.lchown = patchChownErFilter(fs.lchown)

  fs.chmod = patchChownErFilter(fs.chmod)
  fs.fchmod = patchChownErFilter(fs.fchmod)
  fs.lchmod = patchChownErFilter(fs.lchmod)

  fs.chownSync = patchChownSyncErFilter(fs.chownSync)
  fs.fchownSync = patchChownSyncErFilter(fs.fchownSync)
  fs.lchownSync = patchChownSyncErFilter(fs.lchownSync)

  fs.chmodSync = patchChownSyncErFilter(fs.chmodSync)
  fs.fchmodSync = patchChownSyncErFilter(fs.fchmodSync)
  fs.lchmodSync = patchChownSyncErFilter(fs.lchmodSync)

  // if lchmod/lchown do not exist, then make them no-ops
  /* istanbul ignore next */
  if (!fs.lchmod) {
    fs.lchmod = noop
    fs.lchmodSync = noopSync
  }

  /* istanbul ignore next */
  if (!fs.lchown) {
    fs.lchown = noop
    fs.lchownSync = noopSync
  }

  // on Windows, A/V software can lock the directory, causing this
  // to fail with an EACCES or EPERM if the directory contains newly
  // created files.  Try again on failure, for up to 60 seconds.

  // Set the timeout this long because some Windows Anti-Virus, such as Parity
  // bit9, may lock files for up to a minute, causing npm package install
  // failures. Also, take care to yield the scheduler. Windows scheduling gives
  // CPU to a busy looping process, which can cause the program causing the lock
  // contention to be starved of CPU by node, so the contention doesn't resolve.
  /* istanbul ignore next */
  if (process.platform === 'win32') {
    require('./windows-rename-polyfill.js')(fs)
  }

  const {read, readSync} = fs
  // if read() returns EAGAIN, then just try it again.
  fs.read = (fd, buffer, offset, length, position, cb) => {
    cb = normalizeArgs([cb])[1]

    let eagCounter = 0
    read(fd, buffer, offset, length, position, function CB (er, ...args) {
      if (er && er.code === 'EAGAIN' && eagCounter < 10) {
        eagCounter ++
        read(fd, buffer, offset, length, position, CB)
        return
      }

      cb(er, ...args)
    })
  }
  // This ensures `util.promisify` works as it does for native `fs.read`.
  Object.setPrototypeOf(fs.read, read)

  fs.readSync = (...args) => {
    let eagCounter = 0
    while (true) {
      try {
        return readSync(...args)
      } catch (er) {
        if (er.code === 'EAGAIN' && eagCounter < 10) {
          eagCounter ++
          continue
        }

        throw er
      }
    }
  }

  function patchChownErFilter (orig) {
    /* istanbul ignore if */
    if (!orig) {
      return orig
    }

    return (...userArgs) => {
      const [args, cb] = normalizeArgs(userArgs)
      return orig(...args, (er, ...cbArgs) => cb(chownErFilter(er), ...cbArgs))
    }
  }

  function patchChownSyncErFilter (orig) {
    /* istanbul ignore if */
    if (!orig) {
      return orig
    }

    return (...args) => {
      try {
        return orig(...args)
      } catch (er) {
        if (chownErFilter(er)) {
          throw er
        }
      }
    }
  }
}
