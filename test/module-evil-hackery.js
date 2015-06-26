var test = require('tap').test
var realfs = require('fs')
var fs = require('../')

test('module assignment should not leak', function (t) {
    t.plan(1)

    fs.abc = 3
    t.equal(realfs.abc, undefined)
})
