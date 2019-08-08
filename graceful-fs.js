'use strict'

const fs = require('fs')
const util = require('util')

const polyfills = require('./polyfills.js')
const clone = require('./clone.js')
const normalizeArgs = require('./normalize-args.js')

const debug = util.debuglog('gfs4')

const gracefulPatched = Symbol.for('graceful-fs.patched')
const gracefulQueue = Symbol.for('graceful-fs.queue')
const gracefulResetQueue = Symbol.for('graceful-fs.reset-queue')

// Once time initialization
if (!global[gracefulQueue] || global[gracefulResetQueue]) {
  delete global[gracefulResetQueue]

  /* istanbul ignore next: nyc already created this variable, this is untestable */
  if (!global[gracefulQueue]) {
    // This queue can be shared by multiple loaded instances
    const queue = []
    Object.defineProperty(global, gracefulQueue, {
      get () {
        return queue
      }
    })
  }

  const previous = Symbol.for('graceful-fs.previous')
  /* istanbul ignore else: this is always true when running under nyc */
  if (fs.close[previous]) {
    fs.close = fs.close[previous]
  }

  /* istanbul ignore else: this is always true when running under nyc */
  if (fs.closeSync[previous]) {
    fs.closeSync = fs.closeSync[previous]
  }

  // This is used in testing by future versions
  var previous = Symbol.for('graceful-fs.previous')

  // Patch fs.close/closeSync to shared queue version, because we need
  // to retry() whenever a close happens *anywhere* in the program.
  // This is essential when multiple graceful-fs instances are
  // in play at the same time.
  const {close, closeSync} = fs
  fs.close = (fd, cb) => {
    cb = normalizeArgs([cb])[1]

    close(fd, err => {
      // This function uses the graceful-fs shared queue
      if (!err) {
        retry()
      }

      cb(err)
    })
  }
  fs.close[previous] = close

  fs.closeSync = fd => {
    // This function uses the graceful-fs shared queue
    closeSync(fd)
    retry()
  }
  fs.closeSync[previous] = closeSync

  /* istanbul ignore next */
  if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || '')) {
    process.on('exit', () => {
      debug(global[gracefulQueue])
      require('assert').strictEqual(global[gracefulQueue].length, 0)
    })
  }
}

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
      if (files && files.sort) {
        files = files.sort()
      }

      cb(err, files)
    }
  ])

  patchStream(fs, true)
  patchStream(fs, false)

  return fs
}

function enqueue (elem) {
  debug('ENQUEUE', elem[0].name, elem[1])
  global[gracefulQueue].push(elem)
}

function retry () {
  const elem = global[gracefulQueue].shift()
  if (elem) {
    debug('RETRY', elem[0].name, elem[1])
    elem[0](...elem[1])
  }
}
