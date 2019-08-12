'use strict'

const {test} = require('tap')
const {noop, noopSync} = require('../noop.js')

test('noopSync', t => {
  noopSync()
  noopSync('a', 'b', 'c', 'd', 'e', () => t.fail('should not run callback'))

  // Wait a few ticks
  setTimeout(() => {
    t.end()
  }, 50)
})

test('noop', t => {
  const data = {
    cbOnly: 0,
    withArgs: 0
  }

  t.doesNotThrow(() => {
    noop((er, ...args) => {
      t.notOk(er)
      t.is(args.length, 0)
      data.cbOnly++
    })
  }, 'cb only')
  t.is(data.cbOnly, 0, 'callback is not sync')

  t.doesNotThrow(() => {
    noop('a', 'b', 'c', 'd', (er, ...args) => {
      t.notOk(er)
      t.is(args.length, 0)
      data.withArgs++
    })
  }, 'with args')
  t.is(data.withArgs, 0, 'callback is not sync')

  // Wait a few ticks
  setTimeout(() => {
    t.is(data.cbOnly, 1)
    t.is(data.withArgs, 1)
    t.end()
  }, 50)
})
