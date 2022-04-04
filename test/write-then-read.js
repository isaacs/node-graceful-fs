var fs = require('../')
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')
var test = require('tap').test
var p = require('path').resolve(__dirname, 'files')

process.chdir(__dirname)

// Make sure to reserve the stderr fd
process.stderr.write('')

var num = 4097
var paths = new Array(num)

test('make files', function (t) {
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

test('copy files', function (t) {
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

test('copy files with flags', function (t) {
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

test('read files', function (t) {
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

test('cleanup', function (t) {
  rimraf(p, function () {
    t.end()
  })
})
