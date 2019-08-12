'use strict'

const fs = require('fs')
const glob = require('glob')

const ignore = []

if (!('O_SYMLINK' in fs.constants)) {
  ignore.push('lutimes-polyfill.js')
}

if (!fs.Dirent) {
  // Unavailable in node.js 8
  ignore.push('readdir-sort.js')
}

if (!Object.getOwnPropertyDescriptor(fs, 'promises')) {
  ignore.push('promises.js', 'promise-windows-rename-polyfill.js')
}

module.exports = {
  all: true,
  lines: 100,
  statements: 100,
  functions: 100,
  branches: 100,
  include: glob.sync('*.js', {
    cwd: __dirname,
    ignore
  })
}
