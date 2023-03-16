var fs = require('fs')
var tap = require('tap')
var dir = __dirname + '/test'
var node = process.execPath
var path = require('path')

var files = fs.readdirSync(dir)
var env = Object.keys(process.env).reduce(function (env, k) {
  env[k] = process.env[k]
  return env
}, {
  TEST_GRACEFUL_FS_GLOBAL_PATCH: 1
})

tap.jobs = require('os').cpus().length
var testFiles = files.filter(function (f) {
  return (/\.js$/.test(f) && fs.statSync(dir + '/' + f).isFile())
})

tap.plan(testFiles.length)
testFiles.forEach(function(f) {
  tap.test(f, function(t) {
    t.spawn(node, ['--expose-gc', 'test/' + f])
    if (path.basename(f) !== 'monkeypatch-by-accident.js') {
      t.spawn(node, ['--expose-gc', 'test/' + f], {
        env: env
      }, '🐵  test/' + f)
    }
    t.end()
  })
})
