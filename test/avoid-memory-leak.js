'use strict'

const path = require('path')
const v8 = require('v8')
const importFresh = require('import-fresh')
const t = require('tap')
const {promisify} = require('util')

const delay = promisify(setTimeout)
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

async function gfsinit () {
  const gfsPath = path.resolve(__dirname, '../graceful-fs.js')
  const gfsHelper = path.join(__dirname, './helpers/graceful-fs.js')

  delete require.cache[gfsPath]
  const fs = importFresh(gfsHelper)
  // Force initialization of `fs.promises` if available
  if (fs.promises) {
    // fs.promises.open has an async initialization, this ensures it's fully loaded
    const handle = await fs.promises.open(__filename, 'r')
    await handle.close()
  } else {
    // For node.js 8
    await delay(1)
  }
}

t.test('no memory leak when loading multiple times', async t => {
  t.ok(true, 'tap measures the time between first and last test')
  await gfsinit()
  global.gc()

  previousHeapStats = process.memoryUsage()

  // simulate project with 4000 tests
  for (let i = 0; i < 4000; i++) {
    await gfsinit()
  }

  global.gc()
  checkHeap(t)
})

t.test('process is not repeatedly patched', t => {
  const polyfills = path.resolve(__dirname, '../polyfills.js')
  importFresh(polyfills)

  const {cwd, chdir} = process

  importFresh(polyfills)
  t.is(cwd, process.cwd, 'process.cwd not repeatedly patched')
  t.is(chdir, process.chdir, 'process.chdir not repeatedly patched')
  t.end()
})
