'use strict'

const fs = require('./helpers/graceful-fs.js')
const {test} = require('tap')

test('open an existing file works', t => {
  const fd = fs.openSync(__filename, 'r')
  fs.closeSync(fd)
  fs.open(__filename, 'r', (er, fd) => {
    if (er) {
      throw er
    }

    fs.close(fd, er => {
      if (er) {
        throw er
      }

      t.pass('works')
      t.end()
    })
  })
})

if (fs.promises) {
  test('fs.promises.open an existing file works', async t => {
    const filehandle = await fs.promises.open(__filename, 'r')

    t.type(filehandle.getAsyncId, 'function')
    t.type(filehandle.read, 'function')

    await filehandle.close()
  })
}
