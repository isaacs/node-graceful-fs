'use strict';

if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH) {
  require('tap').plan(0, 'obviously not relevant when monkeypatching fs')
  process.exit(0)
}

const fs = require('fs')

// Save originals before loading graceful-fs
const names = [
  'ReadStream',
  'WriteStream',
  'FileReadStream',
  'FileWriteStream'
]
const orig = {}
names.forEach(name => orig[name] = fs[name])

const t = require('tap')
const gfs = require('../')

if (names.some(name => gfs[name] === orig[name])) {
  t.plan(0, 'graceful-fs was loaded before this test was run')
  process.exit(0)
}

t.plan(names.length)
names.forEach(name => {
  t.ok(fs[name] === orig[name], `fs.${name} unchanged`)
})
