var realFs = require('fs')

var methods = ['chown', 'chownSync', 'chmod', 'chmodSync']
methods.forEach(function (method) {
  causeErr(method, realFs[method])
})

function causeErr (method, original) {
  realFs[method] = function (path) {
    var err = makeErr(path, method)
    if (!/Sync$/.test(method)) {
      var cb = arguments[arguments.length - 1]
      process.nextTick(cb.bind(null, err))
    } else {
      throw err
    }
  }
}

function makeErr (path, method) {
  var err = new Error('this is fine')
  err.syscall = method.replace(/Sync$/, '')
  err.code = path.toUpperCase()
  return err
}

var fs = require('../')
var t = require('tap')

var errs = ['ENOSYS', 'EINVAL', 'EPERM']
t.plan(errs.length * methods.length)

errs.forEach(function (err) {
  methods.forEach(function (method) {
    var args = [err]
    if (/chmod/.test(method)) {
      args.push('some mode')
    } else {
      args.push('some uid', 'some gid')
    }

    if (method.match(/Sync$/)) {
      t.doesNotThrow(function () {
        fs[method].apply(fs, args)
      })
    } else {
      args.push(function (err) {
        t.notOk(err)
      })
      fs[method].apply(fs, args)
    }
  })
})
