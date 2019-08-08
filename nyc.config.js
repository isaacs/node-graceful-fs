'use strict'

const {constants} = require('fs')
const glob = require('glob')

module.exports = {
  all: true,
  lines: 100,
  statements: 100,
  functions: 100,
  branches: 100,
  include: glob.sync('*.js', {
    cwd: __dirname,
    ignore: 'O_SYMLINK' in constants ? [] : ['lutimes-polyfill.js']
  })
}
