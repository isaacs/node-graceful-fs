process.env.GRACEFUL_FS_PLATFORM = 'win32'

var fs = require('fs')
var gfs = require('../')
var t = require('tap')
var tmpDir = __dirname + '/tmp'
var testFiles = [];
var id = 0;

function anyFileExists (files) {
  var exists = false;
  for (var i = 0, len = files.length; i < len; i++) {
      if (fs.existsSync(files[i]))
        return true
  }
  return false
}

t.test('setup async', function (t) {
  try { fs.mkdirSync(tmpDir) } catch (e) {}
  for (var i = 0; i < 500; i++) {
    var testFile = tmpDir + '/test-' + id++
    fs.writeFileSync(testFile, id)
    testFiles.push(testFile)
  }
  t.end()
})

t.test('rename async', { timeout: 60000 }, function (t) {
  t.plan(testFiles.length * 2)
  var dest = tmpDir + '/test'
  testFiles.forEach(function (src) {
    gfs.rename(src, dest, function (er) {
      t.error(er, 'Failed to rename file', er)
      t.notOk(fs.existsSync(src), 'Source file still exists:' + src)
    })
  })
})

t.test('setup sync', function (t) {
  try { fs.mkdirSync(tmpDir) } catch (e) {}
  testFiles = []
  for (var i = 0; i < 100; i++) {
    var testFile = tmpDir + '/test-' + id++
    fs.writeFileSync(testFile, id)
    testFiles.push(testFile)
  }
  t.end()
})

t.test('rename sync', { timeout: 60000 }, function (t) {
  t.plan((testFiles.length * 2) + 1)
  var done = 0;
  var errors = 0;
  var dest = tmpDir + '/test'
  testFiles.forEach(function (src) {
    var srcData = fs.readFileSync(src).toString()
    t.doesNotThrow(function () { gfs.renameSync(src, dest) }, 'Exception thrown when renaming')
    var destData = fs.readFileSync(dest).toString()
    t.equal(srcData, destData, 'Data between source and destination differs: ' + srcData + ' !== ' + destData)
  })
  t.notOk(anyFileExists(testFiles), 'Some source files still exist')
})

t.test('cleanup', function (t) {
  testFiles.forEach(function (file) {
    try { fs.removeSync(file) } catch (e) {}
  })
  try { fs.removeSync(tmpDir + '/test') } catch (e) {}
  try { fs.rmdirSync(tmpDir) } catch (e) {}
  t.end()
})


var testDir1 = tmpDir + 'test1'
var testDir2 = tmpDir + 'test2'

function setupDirs() {
  try { fs.mkdirSync(testDir1) } catch (e) {}
  try { fs.mkdirSync(testDir2) } catch (e) {}
}

function teardownDirs() {
  try { fs.rmdirSync(testDir1) } catch (e) {}
  try { fs.rmdirSync(testDir2) } catch (e) {}
}

t.test('rename async dir to existing', { timeout: 60000 }, function (t) {
  t.plan(2)
  setupDirs()
  gfs.rename(testDir1, testDir2, function (err) {
    t.notOk(err)
    if (!err)
      t.notOk(fs.existsSync(testDir1), 'Source directory still exists')
    else
      t.ok(!err)
  })
  teardownDirs()
})

t.test('rename sync dir to existing', { timeout: 60000 }, function (t) {
  t.plan(2)
  setupDirs();
  t.doesNotThrow(function () {
    gfs.renameSync(testDir1, testDir2)
  })
  t.notOk(fs.existsSync(testDir1), 'Source directory still exists')
})
