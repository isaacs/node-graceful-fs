'use strict'

Object.defineProperty(process.versions, 'node', {value: '10.0.0'})

const {test} = require('tap')
const normalizeArgs = require('../normalize-args.js')

const stackTracer = (...args) => normalizeArgs(args)

test('throw on no callback', t => {
  const matchError = {
    code: 'ERR_INVALID_CALLBACK',
    name: 'TypeError',
    message: 'Callback must be a function. Received undefined',
    stack: /^TypeError \[ERR_INVALID_CALLBACK\]: Callback must be a function. Received undefined\n\s*at stackTracer/
  }

  t.throws(() => stackTracer([]), matchError)
  t.throws(() => stackTracer(['blue', 'green']), matchError)

  const newCB = () => {}
  const result = stackTracer('blue', 'green', newCB)
  t.deepEqual(result[0], ['blue', 'green'])
  t.is(result[1], newCB)

  t.end()
})
