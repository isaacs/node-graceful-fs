'use strict'

const fs = require('./helpers/graceful-fs.js')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')
const {test} = require('tap')

const p = require('path').resolve(__dirname, 'files-readfile')

// Make sure to reserve the stderr fd
process.stderr.write('')

const paths = new Array(4097).fill().map((_, i) => `${p}/file-${i}`)

test('write files', t => {
  rimraf.sync(p)
  mkdirp.sync(p)

  t.plan(paths.length * 2)
  for (const i in paths) {
    fs.writeFile(paths[i], 'content', 'ascii', er => {
      t.error(er)
      t.pass('written')
    })
  }
})

test('read files', t => {
  // now read them
  t.plan(paths.length * 2)
  for (const i in paths) {
    fs.readFile(paths[i], 'ascii', (er, data) => {
      t.error(er)
      t.equal(data, 'content')
    })
  }
})

test('cleanup', t => {
  rimraf.sync(p)
  t.end()
})
