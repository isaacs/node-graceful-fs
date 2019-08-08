'use strict'

// this test makes sure that various things get enoent, instead of
// some other kind of throw.

const g = require('./helpers/graceful-fs.js')
const t = require('tap')

const file = 'this file does not exist even a little bit'
const methods = [
  ['open', 'r'],
  ['readFile'],
  ['utimes', new Date(), new Date()],
  ['readdir'],
  ['readdir', {}],
  ['chown', 0, 0],
  ['chmod', 0]
]

t.plan(methods.length)
methods.forEach(([method, ...args]) => {
  t.test(method, t => {
    const methodSync = `${method}Sync`
    t.isa(g[method], 'function')
    t.isa(g[methodSync], 'function')

    args.unshift(file)
    t.throws(() => g[methodSync](...args), {code: 'ENOENT'})

    // add the callback
    args.push(er => {
      t.isa(er, Error)
      t.is(er.code, 'ENOENT')
      t.end()
    })
    t.doesNotThrow(() => g[method](...args))
  })
})
