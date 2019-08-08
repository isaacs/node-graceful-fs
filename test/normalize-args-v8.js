'use strict'

Object.defineProperty(process.versions, 'node', {value: '8.0.0'})

const {test} = require('tap')
const normalizeArgs = require('../normalize-args.js')

const stackTracer = (...args) => normalizeArgs(args)

test('warns on no callback', t => {
  let hits = 0
  process.on('warning', warning => {
    hits++
    t.match(warning, {
      name: 'DeprecationWarning',
      message: 'Calling an asynchronous function without callback is deprecated.',
      code: 'DEP0013',
      stack: /^DeprecationWarning: Calling an asynchronous function without callback is deprecated\.\n\s*at stackTracer/
    }, `warning ${hits}`)
  })

  let result = stackTracer()
  t.deepEqual(result[0], [])
  t.type(result[1], 'function')
  t.notThrow(() => result[1]())
  t.notThrow(() => result[1](new Error('ignored')))

  result = stackTracer('blue', 'green')
  t.deepEqual(result[0], ['blue', 'green'])
  t.type(result[1], 'function')

  const newCB = () => {}
  result = stackTracer('blue', 'green', newCB)
  t.deepEqual(result[0], ['blue', 'green'])
  t.is(result[1], newCB)

  process.nextTick(() => {
    t.is(hits, 2)
    t.end()
  })
})
