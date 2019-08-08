'use strict'

const path = require('path')
const t = require('tap')

const {chdir, cwd} = process
let hits = {
  chdir: 0,
  cwd: 0
}

/* nyc has already caused graceful-fs to be loaded from node_modules.
 * If that version of graceful-fs contains the multiple load protection
 * it will prevent our polyfills.js from replacing process.chdir and
 * process.cwd.  Replacing these functions cause our polyfills.js to
 * still perform process function replacements. */
process.chdir = dir => {
  hits.chdir++
  chdir(dir)
}

process.cwd = () => {
  hits.cwd++
  return cwd()
}

// Side-effect only to force replacement of process.chdir / process.cwd
require('./helpers/graceful-fs.js')

const project = path.resolve(__dirname, '..')

// Ignore any calls that happen during initialization
hits.chdir = 0
hits.cwd = 0

process.chdir(__dirname)
t.is(hits.chdir, 1, 'our chdir was called')
t.is(hits.cwd, 0, 'no calls to cwd')

t.is(process.cwd(), __dirname, 'chdir(__dirname) worked')
t.is(hits.cwd, 1, 'our cwd was called')

t.is(process.cwd(), __dirname, 'cwd twice in a row')
t.is(hits.cwd, 1, 'repeat calls to cwd use cached value')
t.is(hits.chdir, 1, 'no unexpected calls to chdir')

process.chdir(project)
t.is(hits.chdir, 2, 'our chdir was called')
t.is(hits.cwd, 1, 'no unexpected calls to cwd')

t.is(process.cwd(), project, 'chdir(project) worked')
t.is(hits.cwd, 2)
t.is(hits.chdir, 2, 'no unexpected calls to chdir')

t.end()
