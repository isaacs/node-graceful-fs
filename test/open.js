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

test('open a non-existing file throws', t => {
  t.throws(
    () => fs.openSync('this file does not exist', 'r'),
    {code: 'ENOENT'}
  )

  fs.open('neither does this file', 'r', (er, fd) => {
    t.ok(er && er.code === 'ENOENT', 'should throw ENOENT')
    t.notOk(fd, 'should not get an fd')
    t.end()
  })
})
