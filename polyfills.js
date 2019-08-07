var constants = require('constants')
const checkForCallback = require('./check-for-callback.js')
const normalizeArgs = require('./normalize-args.js')

var origCwd = process.cwd
var cwd = null

var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform

process.cwd = function() {
  if (!cwd)
    cwd = origCwd.call(process)
  return cwd
}
try {
  process.cwd()
} catch (er) {}

var chdir = process.chdir
process.chdir = function(d) {
  cwd = null
  chdir.call(process, d)
}

module.exports = patch

function patch (fs) {
  // (re-)implement some things that are known busted or missing.

  // lutimes implementation, or no-op
  if (!fs.lutimes) {
    patchLutimes(fs)
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
  if (!fs.lchmod) {
    fs.lchmod = function (path, mode, cb) {
      if (cb) process.nextTick(cb)
    }
    fs.lchmodSync = function () {}
  }
  if (!fs.lchown) {
    fs.lchown = function (path, uid, gid, cb) {
      if (cb) process.nextTick(cb)
    }
    fs.lchownSync = function () {}
  }

  // on Windows, A/V software can lock the directory, causing this
  // to fail with an EACCES or EPERM if the directory contains newly
  // created files.  Try again on failure, for up to 60 seconds.

  // Set the timeout this long because some Windows Anti-Virus, such as Parity
  // bit9, may lock files for up to a minute, causing npm package install
  // failures. Also, take care to yield the scheduler. Windows scheduling gives
  // CPU to a busy looping process, which can cause the program causing the lock
  // contention to be starved of CPU by node, so the contention doesn't resolve.
  if (platform === "win32") {
    const accessErrors = new Set(['EACCES', 'EPERM'])
    const {rename} = fs

    fs.rename = (from, to, cb) => {
      const start = Date.now()
      let backoff = 0
      cb = normalizeArgs([cb])[1]

      rename(from, to, function CB (er) {
        if (er && accessErrors.has(er.code) && Date.now() - start < 60000) {
          setTimeout(() => {
            fs.stat(to, stater => {
              if (stater && stater.code === 'ENOENT') {
                rename(from, to, CB)
              } else {
                cb(er)
              }
            })
          }, backoff)

          if (backoff < 100) {
            backoff += 10
          }

          return
        }

        cb(er)
      })
    }
  }

  const {read, readSync} = fs
  // if read() returns EAGAIN, then just try it again.
  fs.read = (fd, buffer, offset, length, position, cb) => {
    checkForCallback(cb)

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

  function patchLutimes (fs) {
    if (constants.hasOwnProperty("O_SYMLINK")) {
      fs.lutimes = function (path, at, mt, cb) {
        fs.open(path, constants.O_SYMLINK, function (er, fd) {
          if (er) {
            if (cb) cb(er)
            return
          }
          fs.futimes(fd, at, mt, function (er) {
            fs.close(fd, function (er2) {
              if (cb) cb(er || er2)
            })
          })
        })
      }

      fs.lutimesSync = function (path, at, mt) {
        var fd = fs.openSync(path, constants.O_SYMLINK)
        var ret
        var threw = true
        try {
          ret = fs.futimesSync(fd, at, mt)
          threw = false
        } finally {
          if (threw) {
            try {
              fs.closeSync(fd)
            } catch (er) {}
          } else {
            fs.closeSync(fd)
          }
        }
        return ret
      }

    } else {
      fs.lutimes = function (_a, _b, _c, cb) { if (cb) process.nextTick(cb) }
      fs.lutimesSync = function () {}
    }
  }

  function patchChownErFilter (orig) {
    if (!orig) {
      return orig
    }

    return (...userArgs) => {
      const [args, cb] = normalizeArgs(userArgs)
      return orig(...args, (er, ...cbArgs) => cb(chownErFilter(er), ...cbArgs))
    }
  }

  function patchChownSyncErFilter (orig) {
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

  // ENOSYS means that the fs doesn't support the op. Just ignore
  // that, because it doesn't matter.
  //
  // if there's no getuid, or if getuid() is something other
  // than 0, and the error is EINVAL or EPERM, then just ignore
  // it.
  //
  // This specific case is a silent failure in cp, install, tar,
  // and most other unix tools that manage permissions.
  //
  // When running as root, or if other types of errors are
  // encountered, then it's strict.
  function chownErFilter (er) {
    if (!er || er.code === 'ENOSYS') {
      return
    }

    const nonroot = !process.getuid || process.getuid() !== 0
    if (nonroot && (er.code === 'EINVAL' || er.code === 'EPERM')) {
      return
    }

    return er
  }
}
