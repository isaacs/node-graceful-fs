'use strict'

const fs = require('./helpers/graceful-fs.js')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')
const {test} = require('tap')
const p = require('path').resolve(__dirname, 'files-write-then-read')

// Make sure to reserve the stderr fd
process.stderr.write('')

const paths = new Array(4097).fill().map((_, i) => `${p}/file-${i}`)

test('make files', t => {
  rimraf.sync(p)
  mkdirp.sync(p)

  for (const i in paths) {
    fs.writeFileSync(paths[i], 'content')
  }

  t.end()
})

test('read files', function (t) {
  // now read them
  t.plan(paths.length * 2)
  for (const i in paths) {
    fs.readFile(paths[i], 'ascii', (err, data) => {
      t.error(err)
      t.equal(data, 'content')
    })
  }
})

test('cleanup', t => {
  rimraf.sync(p)
  t.end()
})
