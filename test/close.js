var test = require('tap').test
var fs$close = require('fs').close;
var fs = require('../')

test('`close` is patched correctly', function(t) {
  t.notEqual(fs.close, fs$close, '`close` is unpatched')
  t.end()
})
