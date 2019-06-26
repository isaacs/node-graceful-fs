var importFresh = require('import-fresh');
var t = require('tap')
var v8
try {
  v8 = require('v8')
} catch (er) {}

var previousHeapStats

function checkHeap (t) {
  var v8stats = v8 ? v8.getHeapStatistics() : {}
  var stats = process.memoryUsage()
  if (typeof v8stats.number_of_detached_contexts === 'number')
    t.equal(v8stats.number_of_detached_contexts, 0, 'no detached contexts')
  else {
    const memoryUsage = stats.heapUsed - previousHeapStats.heapUsed
    const memoryUsageMB = Math.round(memoryUsage / Math.pow(1024, 2))
    t.ok(memoryUsageMB < 2, 'expect less than 2MB difference, '
      + memoryUsageMB + 'MB difference found.');
  }
}

t.test('no memory leak when loading multiple times', function(t) {
  t.plan(1);
  importFresh(process.cwd() + '/graceful-fs.js') // node 0.10-5 were getting: Cannot find module '../'
  previousHeapStats = process.memoryUsage()
  // simulate project with 4000 tests
  var i = 0;
  function importFreshGracefulFs() {
    importFresh(process.cwd() + '/graceful-fs.js');
    if (i < 4000) {
      i++;
      process.nextTick(() => importFreshGracefulFs());
    } else {
      global.gc()
      checkHeap(t);
      t.end();
    }
  }
  importFreshGracefulFs();
})
