'use strict'

const fs = require('fs')

const polyfills = require('./polyfills.js')
const clone = require('./clone.js')
const normalizeArgs = require('./normalize-args.js')
const {initQueue, retry, enqueue} = require('./retry-queue.js')
const readdirSort = require('./readdir-sort.js')

const gracefulPatched = Symbol.for('graceful-fs.patched')

initQueue()

module.exports = patch(clone(fs))

function patchENFILE (origImpl, setupArgs) {
  function internalImpl (implArgs, cb) {
    return origImpl(...implArgs, (err, ...args) => {
      if (err && (err.code === 'EMFILE' || err.code === 'ENFILE')) {
        enqueue([internalImpl, [implArgs, cb]])
      } else {
        cb(err, ...args)
        retry()
      }
    })
  }

  if (setupArgs) {
    return (...args) => internalImpl(...setupArgs(...normalizeArgs(args)))
  }

  return (...args) => internalImpl(...normalizeArgs(args))
}

function patchStream (fs, isRead) {
  const name = isRead ? 'ReadStream' : 'WriteStream'
  const origImpl = fs[name]

  function PatchedStream (...args) {
    if (this instanceof PatchedStream) {
      origImpl.apply(this, args)
      return this
    }

    return new PatchedStream(...args)
  }

  PatchedStream.prototype = Object.create(origImpl.prototype)
  PatchedStream.prototype.open = PatchedStream$open

  function PatchedStream$open () {
    fs.open(this.path, this.flags, this.mode, (err, fd) => {
      if (err) {
        if (this.autoClose) {
          this.destroy()
        }

        this.emit('error', err)
      } else {
        this.fd = fd
        this.emit('open', fd)
        if (isRead) {
          this.read()
        }
      }
    })
  }

  let Klass = PatchedStream

  fs[`create${name}`] = (...args) => new Klass(...args)

  Object.defineProperties(fs, {
    [name]: {
      get () {
        return Klass
      },
      set (value) {
        Klass = value
      },
      enumerable: true
    },
    // Legacy name
    [`File${name}`]: {
      value: PatchedStream,
      writable: true,
      enumerable: true
    }
  })
}

function patch (fs) {
  if (fs[gracefulPatched]) {
    return fs
  }

  Object.defineProperty(fs, gracefulPatched, {
    value: true
  })

  // Everything that references the open() function needs to be in here
  polyfills(fs)
  fs.gracefulify = patch

  fs.open = patchENFILE(fs.open)
  fs.readFile = patchENFILE(fs.readFile)
  fs.writeFile = patchENFILE(fs.writeFile)
  fs.appendFile = patchENFILE(fs.appendFile)
  fs.readdir = patchENFILE(fs.readdir, (args, cb) => [
    args,
    (err, files) => {
      cb(err, readdirSort(files))
    }
  ])

  patchStream(fs, true)
  patchStream(fs, false)

  const promises = Object.getOwnPropertyDescriptor(fs, 'promises')
  /* istanbul ignore next */
  if (promises) {
    require('./promises.js')(fs, promises)
  }

  return fs
}
