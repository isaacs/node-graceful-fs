var fs = require('fs')
var polyfills = require('./polyfills.js')
var clone = require('./clone.js')
const normalizeArgs = require('./normalize-args.js')

var util = require('util')

var gracefulQueue = Symbol.for('graceful-fs.queue')

const debug = util.debuglog('gfs4')

// Once time initialization
if (!global[gracefulQueue]) {
  // This queue can be shared by multiple loaded instances
  var queue = []
  Object.defineProperty(global, gracefulQueue, {
    get: function() {
      return queue
    }
  })

  // This is used in testing by future versions
  var previous = Symbol.for('graceful-fs.previous')

  // Patch fs.close/closeSync to shared queue version, because we need
  // to retry() whenever a close happens *anywhere* in the program.
  // This is essential when multiple graceful-fs instances are
  // in play at the same time.
  fs.close = (function (fs$close) {
    function close (fd, cb) {
      return fs$close.call(fs, fd, function (err) {
        // This function uses the graceful-fs shared queue
        if (!err) {
          retry()
        }

        if (typeof cb === 'function')
          cb.apply(this, arguments)
      })
    }

    close[previous] = fs$close
    return close
  })(fs.close)

  fs.closeSync = (function (fs$closeSync) {
    function closeSync (fd) {
      // This function uses the graceful-fs shared queue
      fs$closeSync.apply(fs, arguments)
      retry()
    }

    closeSync[previous] = fs$closeSync
    return closeSync
  })(fs.closeSync)

  if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || '')) {
    process.on('exit', function() {
      debug(global[gracefulQueue])
      require('assert').equal(global[gracefulQueue].length, 0)
    })
  }
}

module.exports = patch(clone(fs))
if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs.__patched) {
    module.exports = patch(fs)
    fs.__patched = true;
}

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
  var elem = global[gracefulQueue].shift()
  if (elem) {
    debug('RETRY', elem[0].name, elem[1])
    elem[0].apply(null, elem[1])
  }
}
