'use strict'

function filehandlePromisesFileHandle (filehandle) {
  return Object.getPrototypeOf(
    Object.getPrototypeOf(filehandle)
  )
}

module.exports = filehandlePromisesFileHandle
