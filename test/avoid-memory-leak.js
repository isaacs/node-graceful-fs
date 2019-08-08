'use strict'

const path = require('path')
const v8 = require('v8')
const importFresh = require('import-fresh')
const t = require('tap')

let previousHeapStats

function checkHeap (t) {
  const v8stats = v8.getHeapStatistics()
  const stats = process.memoryUsage()
  if (typeof v8stats.number_of_detached_contexts === 'number') {
    t.equal(v8stats.number_of_detached_contexts, 0, 'no detached contexts')
  }

  const memoryUsage = stats.heapUsed - previousHeapStats.heapUsed
  const memoryUsageKB = Math.round(memoryUsage / 1024)
  t.ok(
    memoryUsageKB < 2048,
    `expect less than 2048KB difference, ${memoryUsageKB}KB difference found.`
  )
}

t.test('no memory leak when loading multiple times', t => {
  const gfsPath = path.resolve(__dirname, '../graceful-fs.js')
  const gfsHelper = path.join(__dirname, './helpers/graceful-fs.js')
  importFresh(gfsHelper)

  global.gc()
  previousHeapStats = process.memoryUsage()
  // simulate project with 4000 tests
  let i = 0
  function importFreshGracefulFs () {
    delete require.cache[gfsPath]
    // We have to use absolute path because importFresh cannot find
    // relative paths when run from the callback of `process.nextTick`.
    importFresh(gfsHelper)

    if (i < 4000) {
      i++
      process.nextTick(() => importFreshGracefulFs())
    } else {
      global.gc()
      checkHeap(t)
      t.end()
    }
  }

  importFreshGracefulFs()
})
