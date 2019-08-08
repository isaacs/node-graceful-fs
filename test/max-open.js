'use strict'

const fs = require('./helpers/graceful-fs.js')
const {test} = require('tap')

test('open lots of stuff', t => {
  // Get around EBADF from libuv by making sure that stderr is opened
  // Otherwise Darwin will refuse to give us a FD for stderr!
  process.stderr.write('')

  // How many parallel open()'s to do
  const n = 1024
  let opens = 0
  const fds = []
  let going = true
  let closing = false
  let doneCalled = 0

  for (let i = 0; i < n; i++) {
    go()
  }

  function go () {
    opens++
    fs.open(__filename, 'r', (er, fd) => {
      if (er) {
        throw er
      }

      fds.push(fd)
      if (going) {
        go()
      }
    })
  }

  // should hit ulimit pretty fast
  setTimeout(() => {
    going = false
    t.equal(opens - fds.length, n)
    done()
  }, 100)

  function done () {
    if (closing) {
      return
    }

    doneCalled++

    if (fds.length === 0) {
      // First because of the timeout
      // Then to close the fd's opened afterwards
      // Then this time, to complete.
      // Might take multiple passes, depending on CPU speed
      // and ulimit, but at least 3 in every case.
      t.ok(doneCalled >= 2)
      return t.end()
    }

    closing = true
    setTimeout(() => {
      // console.error('do closing again')
      closing = false
      done()
    }, 100)

    // console.error('closing time')
    const closes = fds.slice(0)
    fds.length = 0
    closes.forEach(fd => {
      fs.close(fd, er => {
        if (er) {
          throw er
        }
      })
    })
  }
})
