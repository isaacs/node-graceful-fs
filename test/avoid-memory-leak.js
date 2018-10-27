var importFresh = require('import-fresh');
var t = require('tap')

t.test('no memory leak when loading multiple times', function(t) {
    t.plan(1);
    importFresh(process.cwd() + '/graceful-fs.js') // node 0.10-5 were getting: Cannot find module '../'
    const mbUsedBefore = process.memoryUsage().heapUsed / Math.pow(1024, 2);
    // simulate project with 4000 tests
    var i = 0;
    function importFreshGracefulFs() {
        importFresh(process.cwd() + '/graceful-fs.js');
        if (i < 4000) {
            i++;
            process.nextTick(() => importFreshGracefulFs());
        } else {
            global.gc();
            const mbUsedAfter = process.memoryUsage().heapUsed / Math.pow(1024, 2);
            // We expect less than a 2 MB difference
            const memoryUsageMB = Math.round(mbUsedAfter - mbUsedBefore);
            t.ok(memoryUsageMB < 2, 'We expect less than 2MB difference, but ' + memoryUsageMB + 'MB is still claimed.');
            t.end();
        }
    }
    importFreshGracefulFs();
})
