var fs = require('../')
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')
var t = require('tap')

var td = t.testdir({ files: {} })
var p = require('path').resolve(td, 'files')

process.chdir(td)

// Make sure to reserve the stderr fd
process.stderr.write('')

var num = 4097
var paths = new Array(num)

t.test('make files', function (t) {
  rimraf(p, function (err) {
    if (err) {
      throw err
    }
    mkdirp(p, function (err) {
      if (err) {
        throw err
      }
      for (var i = 0; i < num; ++i) {
        paths[i] = 'files/file-' + i
        fs.writeFileSync(paths[i], 'content')
      }

      t.end()
    })
  })
})

t.test('copy files', function (t) {
  var rem = num
  for (var i = 0; i < num; ++i) {
    paths[i] = 'files/file-' + i
    fs.copyFile(paths[i], paths[i] + '.copy', function(err) {
      if (err)
        throw err
      if (--rem === 0) {
        t.end()
      }
    })
  }
})

t.test('copy files with flags', function (t) {
  var rem = num
  for (var i = 0; i < num; ++i) {
    paths[i] = 'files/file-' + i
    fs.copyFile(paths[i], paths[i] + '.copy', 2, function(err) {
      if (err)
        throw err
      if (--rem === 0) {
        t.end()
      }
    })
  }
})

t.test('read files', function (t) {
  function expectContent(err, data) {
    if (err)
      throw err

    t.equal(data, 'content')
  }

  // now read them
  t.plan(num * 2)
  for (var i = 0; i < num; ++i) {
    fs.readFile(paths[i], 'ascii', expectContent)
    fs.readFile(paths[i] + '.copy', 'ascii', expectContent)
  }
})
