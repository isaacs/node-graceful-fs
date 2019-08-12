'use strict'

const normalizeArgs = require('./normalize-args.js')

const accessErrors = new Set(['EACCES', 'EPERM'])

function windowsRenamePolyfill (fs) {
  const {rename} = fs

  fs.rename = (from, to, cb) => {
    const start = Date.now()
    let backoff = 0
    cb = normalizeArgs([cb])[1]

    rename(from, to, function CB (er) {
      if (er && accessErrors.has(er.code) && Date.now() - start < 60000) {
        setTimeout(() => {
          fs.stat(to, stater => {
            if (stater && stater.code === 'ENOENT') {
              rename(from, to, CB)
            } else {
              cb(er)
            }
          })
        }, backoff)

        if (backoff < 100) {
          backoff += 10
        }

        return
      }

      cb(er)
    })
  }
}

module.exports = windowsRenamePolyfill
