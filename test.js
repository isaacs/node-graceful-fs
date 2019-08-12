'use strict'

const path = require('path')
const tap = require('tap')
const glob = require('glob')

const node = process.execPath
const env = {
  ...process.env,
  TEST_GFS_GLOBAL_PATCH: '1'
}
const files = glob.sync('*.js', {cwd: path.join(__dirname, 'test')})
  .map(f => path.join('test', f))

for (const f of files) {
  const args = ['--no-warnings', '--expose-gc', f]
  tap.spawn(node, args, {}, f)
  tap.spawn(node, args, {env}, `${f} [🐵]`)
}
