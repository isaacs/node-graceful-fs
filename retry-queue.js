'use strict'

const fs = require('fs')
const util = require('util')
const normalizeArgs = require('./normalize-args.js')

const debug = util.debuglog('gfs4')

const gracefulQueue = Symbol.for('graceful-fs.queue')
const gracefulResetQueue = Symbol.for('graceful-fs.reset-queue')

// Once time initialization
function initQueue () {
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
    Object.defineProperty(fs.close, previous, {
      value: close
    })

    fs.closeSync = fd => {
      // This function uses the graceful-fs shared queue
      closeSync(fd)
      retry()
    }
    Object.defineProperty(fs.closeSync, previous, {
      value: closeSync
    })

    /* istanbul ignore next */
    if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || '')) {
      process.on('exit', () => {
        debug(global[gracefulQueue])
        require('assert').strictEqual(global[gracefulQueue].length, 0)
      })
    }
  }
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

module.exports = {initQueue, enqueue, retry}
