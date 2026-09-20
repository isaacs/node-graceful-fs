'use strict'

module.exports = clone

var getPrototypeOf = Object.getPrototypeOf || function (obj) {
  return obj.__proto__
}

function clone (obj) {
  if (obj === null || typeof obj !== 'object')
    return obj

  if (obj instanceof Object)
    var copy = { __proto__: getPrototypeOf(obj) }
  else
    var copy = Object.create(null)

  Object.getOwnPropertyNames(obj).forEach(function (key) {
    var desc = Object.getOwnPropertyDescriptor(obj, key)
    // Getter-only properties (common on bundler/ESM `fs` shims) cannot
    // be assigned on the clone either unless we materialize them.
    if (desc && desc.get && !desc.set) {
      Object.defineProperty(copy, key, {
        value: obj[key],
        writable: true,
        enumerable: desc.enumerable,
        configurable: true
      })
    } else {
      Object.defineProperty(copy, key, desc)
    }
  })

  return copy
}
