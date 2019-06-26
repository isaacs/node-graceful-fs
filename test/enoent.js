// this test makes sure that various things get enoent, instead of
// some other kind of throw.

var g = require('../')

var NODE_VERSION_MAJOR_WITH_BIGINT = 10
var NODE_VERSION_MINOR_WITH_BIGINT = 5
var NODE_VERSION_PATCH_WITH_BIGINT = 0
var nodeVersion = process.versions.node.split('.')
var nodeVersionMajor = Number.parseInt(nodeVersion[0], 10)
var nodeVersionMinor = Number.parseInt(nodeVersion[1], 10)
var nodeVersionPatch = Number.parseInt(nodeVersion[2], 10)

function nodeSupportsBigInt () {
  if (nodeVersionMajor > NODE_VERSION_MAJOR_WITH_BIGINT) {
    return true
  } else if (nodeVersionMajor === NODE_VERSION_MAJOR_WITH_BIGINT) {
    if (nodeVersionMinor > NODE_VERSION_MINOR_WITH_BIGINT) {
      return true
    } else if (nodeVersionMinor === NODE_VERSION_MINOR_WITH_BIGINT) {
      if (nodeVersionPatch >= NODE_VERSION_PATCH_WITH_BIGINT) {
        return true
      }
    }
  }
  return false
}

var t = require('tap')
var file = 'this file does not exist even a little bit'
var methods = [
  ['open', 'r'],
  ['readFile'],
  ['stat'],
  ['lstat'],
  ['utimes', new Date(), new Date()],
  ['readdir']
]

// any version > v6 can do readdir(path, options, cb)
if (process.version.match(/^v([6-9]|[1-9][0-9])\./)) {
  methods.push(['readdir', {}])
}

// any version > v10.5 can do stat(path, options, cb)
if (nodeSupportsBigInt()) {
  methods.push(['stat', {}])
  methods.push(['lstat', {}])
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
