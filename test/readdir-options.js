var fs = require("fs")
var t = require("tap")

var currentTest

var strings = ['b', 'z', 'a']
var buffs = strings.map(function (s) { return Buffer.from(s) })
var hexes = buffs.map(function (b) { return b.toString('hex') })

function getRet (encoding) {
  switch (encoding) {
    case 'hex':
      return hexes
    case 'buffer':
      return buffs
    default:
      return strings
  }
}

var readdir = fs.readdir
var failed = false
fs.readdir = function(path, options, cb) {
  if (!failed) {
    // simulate an EMFILE and then open and close a thing to retry
    failed = true
    process.nextTick(function () {
      var er = new Error('synthetic emfile')
      er.code = 'EMFILE'
      cb(er)
      process.nextTick(function () {
        g.closeSync(fs.openSync(__filename, 'r'))
      })
    })
    return
  }

  failed = false
  currentTest.isa(cb, 'function')
  currentTest.isa(options, 'object')
  currentTest.ok(options)
  process.nextTick(function() {
    var ret = getRet(options.encoding)
    cb(null, ret)
  })
}

var g = require("../")

var encodings = ['buffer', 'hex', 'utf8', null]
encodings.forEach(function (enc) {
  t.test('encoding=' + enc, function (t) {
    currentTest = t
    g.readdir("whatevers", { encoding: enc }, function (er, files) {
      if (er)
        throw er
      t.same(files, getRet(enc).sort())
      t.end()
    })
  })
})
