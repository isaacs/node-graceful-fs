'use strict'

const gfs = require('../../graceful-fs.js')

module.exports = process.env.TEST_GFS_GLOBAL_PATCH ? gfs.gracefulify(require('fs')) : gfs
