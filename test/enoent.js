// this test makes sure that various things get enoent, instead of
// some other kind of throw.

var g = require('./helpers/graceful-fs.js')
var t = require('tap')
var file = 'this file does not exist even a little bit'
var methods = [
  ['open', 'r'],
  ['readFile'],
  ['utimes', new Date(), new Date()],
  ['readdir'],
  ['chown', 0, 0],
  ['chmod', 0]
]

// any version > v6 can do readdir(path, options, cb)
if (process.version.match(/^v([6-9]|[1-9][0-9])\./)) {
  methods.push(['readdir', {}])
}

t.plan(methods.length)
methods.forEach(function (method) {
  t.test(method[0], runTest(method))
})

function runTest (args) { return function (t) {
  var method = args.shift()
  args.unshift(file)
  var methodSync = method + 'Sync'
  t.isa(g[methodSync], 'function')
  t.throws(function () {
    g[methodSync].apply(g, args)
  }, { code: 'ENOENT' })
  // add the callback
  args.push(verify(t))
  t.isa(g[method], 'function')
  t.doesNotThrow(function () {
    g[method].apply(g, args)
  })
}}

function verify (t) { return function (er) {
  t.isa(er, Error)
  t.equal(er.code, 'ENOENT')
  t.end()
}}
