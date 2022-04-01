var importFresh = require('import-fresh');
var t = require('tap')
var v8
try {
  v8 = require('v8')
} catch (er) {}

if (!v8 || !v8.getHeapStatistics || typeof v8.getHeapStatistics().number_of_detached_contexts !== 'number') {
  t.plan(0, 'no reliable context tracking available')
  process.exit(0)
}

if (typeof global.gc !== 'function') {
  t.plan(0, '--expose_gc not enabled')
  process.exit(0)
}

function checkHeap (t) {
  var v8stats = v8.getHeapStatistics()
  t.equal(v8stats.number_of_detached_contexts, 0, 'no detached contexts')
}

t.test('no memory leak when loading multiple times', function(t) {
  t.plan(1);
  importFresh(process.cwd() + '/graceful-fs.js') // node 0.10-5 were getting: Cannot find module '../'
  // simulate project with 4000 tests
  var i = 0;
  function importFreshGracefulFs() {
    importFresh(process.cwd() + '/graceful-fs.js');
    if (i < 4000) {
      i++;
      process.nextTick(importFreshGracefulFs)
    } else {
      global.gc()
      checkHeap(t);
      t.end();
    }
  }
  importFreshGracefulFs();
})
