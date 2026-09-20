'use strict'

// Lock the historical CJS sharing path: when `fs` is extensible, the
// retry queue is published on `fs` via Symbol.for('graceful-fs.queue')
// so multiple graceful-fs copies see the same array (#245 fallback
// must not change this).

var fs = require('fs')
var t = require('tap')

var queueSymbol = typeof Symbol === 'function' && typeof Symbol.for === 'function'
  ? Symbol.for('graceful-fs.queue')
  : '___graceful-fs.queue'

t.ok(Object.isExtensible(fs), 'CJS fs is extensible')

var gfs = require('../')
t.type(gfs.readFile, 'function')
t.ok(Array.isArray(fs[queueSymbol]), 'queue published on fs when extensible')
t.ok(Array.isArray(global[queueSymbol]), 'queue also published on global')
t.equal(fs[queueSymbol], global[queueSymbol], 'fs and global share one queue array')
