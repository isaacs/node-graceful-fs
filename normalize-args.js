'use strict'

const checkForCallback = require('./check-for-callback.js')

function normalizeArgs (args) {
  let cb = args.slice(-1)[0]
  if (checkForCallback(cb, normalizeArgs)) {
    args.splice(-1, 1)
  } else {
    /* This is for node.js < 10 only, newer versions will throw in checkForCallback. */
    cb = () => {}
  }

  return [args, cb]
}

module.exports = normalizeArgs
