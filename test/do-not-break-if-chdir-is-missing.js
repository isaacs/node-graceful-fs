process.chdir = 'i am not a function so dont call me maybe'
const t = require('tap')
require('../')
t.equal(process.chdir, 'i am not a function so dont call me maybe')
