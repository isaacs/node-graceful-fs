'use strict'

const normalizeArgs = require('./normalize-args.js')

function noop (...args) {
  const cb = normalizeArgs(args)[1]
  process.nextTick(cb)
}

function noopSync () {
}

module.exports = {
  noop,
  noopSync
}
