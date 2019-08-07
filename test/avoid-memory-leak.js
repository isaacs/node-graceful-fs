var path = require('path')
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
  const gfsPath = path.resolve(__dirname, '../graceful-fs.js')
  const gfsHelper = path.join(__dirname, './helpers/graceful-fs.js')
  importFresh(gfsHelper)

  t.plan(1);
  previousHeapStats = process.memoryUsage()
  // simulate project with 4000 tests
  var i = 0;
  function importFreshGracefulFs() {
    delete require.cache[gfsPath]
    // We have to use absolute path because importFresh cannot find
    // relative paths when run from the callback of `process.nextTick`.
    importFresh(gfsHelper)

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
