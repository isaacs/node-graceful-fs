'use strict'

const fs = require('fs')

fs.readdir = (path, cb) => {
  process.nextTick(() => {
    cb(null, ['b', 'z', 'a'])
  })
}

const g = require('./helpers/graceful-fs.js')
const {test} = require('tap')

test('readdir reorder', t => {
  g.readdir('whatevers', (er, files) => {
    if (er) {
      throw er
    }

    t.same(files, ['a', 'b', 'z'])
    t.end()
  })
})
