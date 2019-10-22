const t = require('tap')
const gfs = require('../')
t.equal(gfs.ReadStream, gfs.FileReadStream)
t.equal(gfs.WriteStream, gfs.FileWriteStream)
const frs = {}
const fws = {}
gfs.FileReadStream = frs
gfs.FileWriteStream = fws
t.equal(gfs.FileReadStream, frs)
t.equal(gfs.FileWriteStream, fws)
t.notEqual(gfs.ReadStream, frs)
t.notEqual(gfs.WriteStream, fws)
t.notEqual(gfs.ReadStream, gfs.FileReadStream)
t.notEqual(gfs.WriteStream, gfs.FileWriteStream)
