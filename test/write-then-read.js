'use strict'

const path = require('path')
const fs = require('./helpers/graceful-fs.js')
const rimraf = require('rimraf')
const {test} = require('tap')

// Make sure to reserve the stderr fd
process.stderr.write('')

const p = fs.mkdtempSync(path.join(__dirname, 'temp-files-'))
const paths = new Array(4097).fill().map((_, i) => `${p}/file-${i}`)

test('make files', t => {
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
