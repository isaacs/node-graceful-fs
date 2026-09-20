'use strict'

var fs = require('fs')
var path = require('path')
var t = require('tap')

// Must wrap the exported fs.write that writeAll uses *before* loading
// graceful-fs, so the chunking wrapper captures this spy.
var INT32_MAX = 2147483647
var writes = []

function fakeWrite (fd, buffer, offset, length, position, cb) {
  if (typeof position === 'function') {
    cb = position
    position = null
  }
  if (typeof length === 'function') {
    cb = length
    length = buffer.byteLength - (typeof offset === 'number' ? offset : 0)
    position = null
  }
  if (typeof offset === 'function') {
    cb = offset
    offset = 0
    length = buffer.byteLength
    position = null
  }
  writes.push({
    offset: offset,
    length: length,
    position: position
  })
  process.nextTick(function () {
    cb(null, length, buffer)
  })
}

function fakeWriteSync (fd, buffer, offset, length, position) {
  if (typeof offset !== 'number')
    offset = 0
  if (typeof length !== 'number')
    length = buffer.byteLength - offset
  writes.push({
    offset: offset,
    length: length,
    position: position,
    sync: true
  })
  return length
}

fs.write = fakeWrite
fs.writeSync = fakeWriteSync

var gfs = require('../')

t.test('write() does not chunk lengths at or below INT32_MAX', function (t) {
  writes.length = 0
  var buf = Buffer.alloc(16)
  gfs.write(1, buf, 0, 16, null, function (err, written, buffer) {
    t.error(err)
    t.equal(written, 16)
    t.equal(buffer, buf)
    t.equal(writes.length, 1)
    t.equal(writes[0].length, 16)
    t.end()
  })
})

t.test('write() chunks length greater than INT32_MAX', function (t) {
  writes.length = 0
  var buf = Buffer.alloc(8)
  gfs.write(1, buf, 0, INT32_MAX + 1, null, function (err, written, buffer) {
    t.error(err)
    t.equal(written, INT32_MAX + 1)
    t.equal(buffer, buf)
    t.equal(writes.length, 2)
    t.equal(writes[0].offset, 0)
    t.equal(writes[0].length, INT32_MAX)
    t.equal(writes[1].offset, INT32_MAX)
    t.equal(writes[1].length, 1)
    t.end()
  })
})

t.test('write() 5-arg form chunks length greater than INT32_MAX', function (t) {
  writes.length = 0
  var buf = Buffer.alloc(8)
  gfs.write(1, buf, 0, INT32_MAX + 5, function (err, written) {
    t.error(err)
    t.equal(written, INT32_MAX + 5)
    t.equal(writes.length, 2)
    t.equal(writes[0].length, INT32_MAX)
    t.equal(writes[1].offset, INT32_MAX)
    t.equal(writes[1].length, 5)
    t.end()
  })
})

t.test('write() options form chunks length greater than INT32_MAX', function (t) {
  writes.length = 0
  var buf = Buffer.alloc(8)
  gfs.write(1, buf, { offset: 0, length: INT32_MAX + 1, position: null }, function (err, written) {
    t.error(err)
    t.equal(written, INT32_MAX + 1)
    t.equal(writes.length, 2)
    t.equal(writes[0].length, INT32_MAX)
    t.equal(writes[1].length, 1)
    t.end()
  })
})

t.test('writeSync() chunks length greater than INT32_MAX', function (t) {
  writes.length = 0
  var buf = Buffer.alloc(8)
  var written = gfs.writeSync(1, buf, 0, INT32_MAX + 1)
  t.equal(written, INT32_MAX + 1)
  t.equal(writes.length, 2)
  t.equal(writes[0].length, INT32_MAX)
  t.equal(writes[0].sync, true)
  t.equal(writes[1].length, 1)
  t.end()
})

t.test('string write is not treated as a large binary write', function (t) {
  writes.length = 0
  gfs.write(1, 'hello', null, 'utf8', function (err) {
    t.error(err)
    t.equal(writes.length, 1)
    t.end()
  })
})

t.test('writeFile does not pass length > INT32_MAX to write', function (t) {
  var buf
  try {
    buf = Buffer.allocUnsafe(INT32_MAX + 1)
  } catch (er) {
    t.skip('cannot allocate 2GiB buffer: ' + er.message)
    return t.end()
  }

  writes.length = 0
  var file = path.join(t.testdir({}), 'large')
  gfs.writeFile(file, buf, function (err) {
    t.error(err)
    t.ok(writes.length >= 2, 'split into multiple writes, got ' + writes.length)
    for (var i = 0; i < writes.length; i++) {
      t.ok(
        writes[i].length <= INT32_MAX,
        'chunk ' + i + ' length ' + writes[i].length + ' <= INT32_MAX'
      )
    }
    var total = writes.reduce(function (sum, w) { return sum + w.length }, 0)
    t.equal(total, INT32_MAX + 1)
    t.end()
  })
})
