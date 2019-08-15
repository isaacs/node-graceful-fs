'use strict'

const clone = require('./clone.js')
const chownErFilter = require('./chown-er-filter.js')
const {retry, enqueue} = require('./retry-queue.js')
const readdirSort = require('./readdir-sort.js')

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

async function patchFileHandleClose (promises) {
  const filehandle = await promises.open(__filename, 'r')
  const Klass = Object.getPrototypeOf(filehandle)
  await filehandle.close()

  const {close} = Klass
  if (/graceful-fs replacement/.test(close.toString())) {
    return
  }

  Klass.close = async function (...args) {
    /* graceful-fs replacement */
    await close.apply(this, args)
    retry()
  }

  // Just in case a promises FileHandle closed before we could monkey-patch it
  retry()
}

function initPromises (orig) {
  // Checking `orig.value` handles situations where a user does
  // something like require('graceful-fs).gracefulify({...require('fs')})
  const origPromises = orig.value || orig.get()
  patchFileHandleClose(origPromises).catch(
    /* istanbul ignore next: this should never happen */
    console.error
  )

  const promises = clone(origPromises)
  promises.open = patchAsyncENFILE(promises.open, filehandle => {
    /* It's too bad node.js makes it impossible to extend the
     * actual filehandle class. */
    const replacementFns = {
      async chmod (...args) {
        try {
          await filehandle.chmod(...args)
        } catch (er) {
          if (chownErFilter(er)) {
            throw er
          }
        }
      },
      async chown (...args) {
        try {
          await filehandle.chown(...args)
        } catch (er) {
          if (chownErFilter(er)) {
            throw er
          }
        }
      },
      async read (...args) {
        let eagCounter = 0
        while (true) {
          try {
            return await filehandle.read(...args)
          } catch (er) {
            if (er.code === 'EAGAIN' && eagCounter < 10) {
              eagCounter ++
              continue
            }

            throw er
          }
        }
      }
    }

    return new Proxy(filehandle, {
      get (filehandle, prop) {
        if (!(prop in replacementFns)) {
          const original = filehandle[prop]
          if (typeof original !== 'function') {
            return original
          }

          replacementFns[prop] = original.bind(filehandle)
        }

        return replacementFns[prop]
      }
    })
  })

  promises.readFile = patchAsyncENFILE(promises.readFile)
  promises.writeFile = patchAsyncENFILE(promises.writeFile)
  promises.appendFile = patchAsyncENFILE(promises.appendFile)
  promises.readdir = patchAsyncENFILE(promises.readdir, readdirSort)

  promises.chmod = patchChown(promises.chmod)
  promises.lchmod = patchChown(promises.lchmod)
  promises.chown = patchChown(promises.chown)
  promises.lchown = patchChown(promises.lchown)

  /* istanbul ignore next */
  if (process.platform === 'win32') {
    require('./promise-windows-rename-polyfill.js')(promises)
  }

  return promises
}

function patchPromises (fs, orig) {
  let promises
  /* istanbul ignore next: ignoring the version specific branch, initPromises is covered */
  if (orig.enumerable) {
    // If enumerable is enabled fs.promises is not experimental, no warning
    promises = initPromises(orig)
  }

  Object.defineProperty(fs, 'promises', {
    // enumerable is true in node.js 11+ where fs.promises is stable
    enumerable: orig.enumerable,
    configurable: true,
    get () {
      /* istanbul ignore next: ignoring the version specific branch, initPromises is covered */
      if (!promises) {
        promises = initPromises(orig)
      }

      return promises
    }
  })
}

module.exports = patchPromises
