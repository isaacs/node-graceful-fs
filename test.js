var spawn = require('child_process').spawn
var fs = require('fs')
var tap = require('tap')
var dir = __dirname + '/test'
var node = process.execPath

var files = fs.readdirSync(dir)
var env = Object.keys(process.env).reduce(function (env, k) {
  env[k] = process.env[k]
  return env
}, {
  TEST_GRACEFUL_FS_GLOBAL_PATCH: 1
})

files.filter(function (f) {
  if (fs.statSync(dir + '/' + f).isFile()) {
    tap.spawn(node, ['test/' + f])
    return true
  }
}).forEach(function (f) {
  tap.spawn(node, ['test/' + f], {
    env: env
  }, '🐵  test/' + f)
})
