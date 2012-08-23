[![build status](https://secure.travis-ci.org/isaacs/node-graceful-fs.png)](http://travis-ci.org/isaacs/node-graceful-fs)
Just like node's `fs` module, but it does an incremental back-off when
EMFILE is encountered.

Useful in asynchronous situations where one needs to try to open lots
and lots of files.
