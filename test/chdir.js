'use strict'

const path = require('path')
const t = require('tap')

// Side-effect only to force replacement of process.chdir / process.cwd
require('./helpers/graceful-fs.js')

const project = path.resolve(__dirname, '..')

process.chdir(__dirname)
t.is(process.cwd(), __dirname, 'chdir(__dirname) worked')
process.chdir(project)
t.is(process.cwd(), project, 'chdir(project) worked')
t.end()
