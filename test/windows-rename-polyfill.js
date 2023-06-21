process.env.GRACEFUL_FS_PLATFORM = 'win32'
var t = require('tap')

var fs = require('fs')

var ers = ['EPERM', 'EBUSY', 'EACCES']
t.plan(ers.length)
ers.forEach(function(code) {
  t.test(code, function(t) {
    fs.rename = function (a, b, cb) {
      setTimeout(function () {
        var er = new Error(code + ' blerg')
        er.code = code
        cb(er)
      })
    }

    var gfs = require('../')
    var a = __dirname + '/a'
    var b = __dirname + '/b'

    t.test('setup', function (t) {
      try { fs.mkdirSync(a) } catch (e) {}
      try { fs.mkdirSync(b) } catch (e) {}
      t.end()
    })

    t.test('rename', { timeout: 100 }, function (t) {
      t.plan(1)

      gfs.rename(a, b, function (er) {
        t.ok(er)
      })
    })

    t.test('cleanup', function (t) {
      try { fs.rmdirSync(a) } catch (e) {}
      try { fs.rmdirSync(b) } catch (e) {}
      t.end()
    })

    t.end()
  })
})
