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
  if (/\.js$/.test(f) && fs.statSync(dir + '/' + f).isFile()) {
    // expose-gc is so we can check for memory leaks
    tap.spawn(node, ['--expose-gc', 'test/' + f])
    return true
  }
}).forEach(function (f) {
  tap.spawn(node, ['--expose-gc', 'test/' + f], {
    env: env
  }, '🐵  test/' + f)
})
