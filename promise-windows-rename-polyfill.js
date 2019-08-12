'use strict'

const {promisify} = require('util')

const accessErrors = new Set(['EACCES', 'EPERM'])

const delay = promisify(setTimeout)

function promiseWindowsRenamePolyfill (fs) {
  const {rename} = fs

  fs.rename = async (from, to) => {
    const start = Date.now()
    let backoff = 0

    while (true) {
      try {
        return await rename(from, to)
      } catch (er) {
        if (!accessErrors.has(er.code) || Date.now() - start >= 60000) {
          throw er
        }

        await delay(backoff)

        // The only way this `await` resolves is if fs.stat throws ENOENT.
        await fs.stat(to).then(
          () => {
            throw er
          },
          stater => {
            if (stater.code !== 'ENOENT') {
              throw er
            }
          }
        )

        if (backoff < 100) {
          backoff += 10
        }
      }
    }
  }
}

module.exports = promiseWindowsRenamePolyfill
