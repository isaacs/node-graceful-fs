'use strict'

module.exports = clone

function clone (obj) {
  const copy = Object.create(Object.getPrototypeOf(obj))

  for (const key of Object.getOwnPropertyNames(obj)) {
    Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key))
  }

  return copy
}
