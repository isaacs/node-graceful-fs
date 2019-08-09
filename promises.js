'use strict'

const {promisify} = require('util')

const clone = require('./clone.js')
const chownErFilter = require('./chown-er-filter.js')
const {retry, enqueue} = require('./retry-queue.js')

// This is the native C++ FileHandle
const {FileHandle} = process.binding('fs')

// We need the constructor of the object returned by
// fs.promises.open so we can extend it
async function getPromisesFileHandle (open) {
  const handle = await open(__filename, 'r')
  const PromisesFileHandle = handle.constructor

  await handle.close()

  return PromisesFileHandle
}

function patchChown (orig) {
  return (...args) => orig(...args).catch(er => {
    if (chownErFilter(er)) {
      throw er
    }
  })
}

function patchAsyncENFILE (origImpl, next = res => res) {
  const attempt = (args, resolve, reject) => {
    origImpl(...args)
      .then(res => {
        process.nextTick(retry)
        resolve(next(res))
      })
      .catch(err => {
        if (err.code === 'EMFILE' || err.code === 'ENFILE') {
          enqueue([attempt, [args, resolve, reject]])
        } else {
          process.nextTick(retry)
          reject(err)
        }
      })
  }

  return (...args) => new Promise((resolve, reject) => attempt(args, resolve, reject))
}

async function setupOpen (fs, promises) {
  const PromisesFileHandle = await getPromisesFileHandle(promises.open)
  class GracefulFileHandle extends PromisesFileHandle {
    // constructor (filehandle)
    // getAsyncId ()
    // get fd ()
    // datasync ()
    // sync ()
    // stat (options)
    // truncate (len = 0)
    // utimes (atime, mtime)
    // write (buffer, offset, length, position)

    // fd is already open so no need to use `patchAsyncENFILE` functions from here
    // appendFile (data, options)
    // readFile (options)
    // writeFile (data, options)

    async chmod (mode) {
      return super.chmod(mode).catch(er => {
        if (chownErFilter(er)) {
          throw er
        }
      })
    }

    async chown (uid, gid) {
      return super.chown(uid, gid).catch(er => {
        if (chownErFilter(er)) {
          throw er
        }
      })
    }

    async read (buffer, offset, length, position) {
      let eagCounter = 0
      while (true) {
        try {
          return await super.read(buffer, offset, length, position)
        } catch (er) {
          if (er.code === 'EAGAIN' && eagCounter < 10) {
            eagCounter ++
            continue
          }

          throw er
        }
      }
    }

    async close () {
      await super.close()
      retry()
    }
  }

  // fs.open is already patched, do not use patchAsyncENFILE here
  const open = promisify(fs.open)
  promises.open = async (...args) => {
    return new GracefulFileHandle(new FileHandle(await open(...args)))
  }
}

function patchPromises (fs, orig) {
  let promises
  Object.defineProperty(fs, 'promises', {
    configurable: true,
    get () {
      if (!promises) {
        // Checking `orig.value` handles situations where a user does
        // something like require('graceful-fs).gracefulify({...require('fs')})
        promises = clone(orig.value || orig.get())
        const initOpen = setupOpen(fs, promises)

        // This is temporary because node.js doesn't directly expose
        // everything we need, some async operations are required to
        // construct the real replacement for open
        promises.open = async (...args) => {
          await initOpen
          return promises.open(...args)
        }

        promises.readFile = patchAsyncENFILE(promises.readFile)
        promises.writeFile = patchAsyncENFILE(promises.writeFile)
        promises.appendFile = patchAsyncENFILE(promises.appendFile)
        promises.readdir = patchAsyncENFILE(promises.readdir, files => files.sort())

        promises.chmod = patchChown(promises.chmod)
        promises.lchmod = patchChown(promises.lchmod)
        promises.chown = patchChown(promises.chown)
        promises.lchown = patchChown(promises.lchown)

        /* istanbul ignore next */
        if (process.platform === 'win32') {
          require('./promise-windows-rename-polyfill.js')(promises)
        }
      }

      return promises
    }
  })
}

module.exports = patchPromises
