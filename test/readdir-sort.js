'use strict'

const fs = require('fs')
const {promisify} = require('util')

fs.readdir = (path, cb) => {
  process.nextTick(() => {
    cb(null, ['b', 'z', 'a'])
  })
}

if (fs.promises) {
  fs.promises.readdir = async (path) => {
    return ['b', 'z', 'a']
  }
}

const g = require('./helpers/graceful-fs.js')
const {test} = require('tap')

test('readdir reorder', async t => {
  let files = await promisify(g.readdir)('whatevers')
  t.same(files, ['a', 'b', 'z'])

  if (g.promises) {
    files = await g.promises.readdir('whatevers')
    t.same(files, ['a', 'b', 'z'])
  }
})
