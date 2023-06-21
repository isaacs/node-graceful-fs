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
t.not(gfs.ReadStream, frs)
t.not(gfs.WriteStream, fws)
t.not(gfs.ReadStream, gfs.FileReadStream)
t.not(gfs.WriteStream, gfs.FileWriteStream)
