'use strict'

const {constants} = require('fs')
const {noop, noopSync} = require('./noop.js')
const normalizeArgs = require('./normalize-args.js')

function patchLutimes (fs) {
  /* istanbul ignore if: coverage for this file is ignored if O_SYMLINK is not defined. */
  if (typeof constants.O_SYMLINK === 'undefined') {
    fs.lutimes = noop
    fs.lutimesSync = noopSync
    return
  }

  fs.lutimes = (path, at, mt, cb) => {
    cb = normalizeArgs([cb])[1]

    fs.open(path, constants.O_SYMLINK, (er, fd) => {
      if (er) {
        cb(er)
        return
      }

      fs.futimes(fd, at, mt, er => {
        fs.close(fd, er2 => {
          cb(er || er2)
        })
      })
    })
  }

  fs.lutimesSync = (path, at, mt) => {
    const fd = fs.openSync(path, constants.O_SYMLINK)
    let ret
    let threw = true
    try {
      ret = fs.futimesSync(fd, at, mt)
      threw = false
    } finally {
      if (threw) {
        try {
          fs.closeSync(fd)
        } catch (er) {}
      } else {
        fs.closeSync(fd)
      }
    }

    return ret
  }
}

module.exports = patchLutimes
