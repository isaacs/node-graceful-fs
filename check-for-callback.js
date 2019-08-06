'use strict'

const nodeMajor = process.versions.node.split('.')[0]

/* This function emulates the functionality of node.js 7, 8 and 9 by emitting a
 * deprecation warning.  In node.js 10+ a TypeError is produced. */
function checkForCallback (cb, ctor) {
  if (typeof cb === 'function') {
    return true
  }

  if (nodeMajor >= 10) {
    /* It's possible that the caller provided something incorrect for the callback
     * but more likely they omitted the argument.
     *
     * The error is technically wrong if someone provides something for the callback
     * argument which is not a function, for example `fs.mkdir('/path', {}, 'cb')`
     * should say that a string was provided.  Providing the correct exception for
     * this off nominal case would require argument processing to be specific to each
     * patched function. */
    const error = new TypeError('Callback must be a function. Received undefined')
    error.code = 'ERR_INVALID_CALLBACK'

    /* The next 4 lines are copied from node.js, lib/internal/errors.js:addCodeToName() */
    error.name = `${error.name} [${error.code}]`
    Error.captureStackTrace(error, ctor)
    error.stack // eslint-disable-line no-unused-expressions
    delete error.name

    throw error
  }

  process.emitWarning(
    'Calling an asynchronous function without callback is deprecated.',
    'DeprecationWarning',
    'DEP0013',
    ctor || checkForCallback
  )
  return false
}

module.exports = checkForCallback
