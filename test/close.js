var fs$close = require('fs').close;
var fs$closeSync = require('fs').closeSync;
var fs = require('../');
var test = require('tap').test

test('`close` is patched correctly', function(t) {
  t.notEqual(fs.close, fs$close, 'patch close');
  t.notEqual(fs.closeSync, fs$closeSync, 'patch closeSync');
  t.end();
})
