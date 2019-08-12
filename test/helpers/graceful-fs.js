'use strict'

/* This is to force use of *our* fs.close / fs.closeSync even if
 * nyc is using a version of graceful-fs with the shared queue */
global[Symbol.for('graceful-fs.reset-queue')] = true

const gfs = require('../../graceful-fs.js')

module.exports = process.env.TEST_GFS_GLOBAL_PATCH ? gfs.gracefulify(require('fs')) : gfs
