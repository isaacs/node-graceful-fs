'use strict'

const path = require('path')
const fs = require('./helpers/graceful-fs.js')
const rimraf = require('rimraf')
const {test} = require('tap')

// Make sure to reserve the stderr fd
process.stderr.write('')

const tmpdir = fs.mkdtempSync(path.join(__dirname, 'temp-files-'))
const dir = path.join(tmpdir, 'tmp')
const paths = new Array(4097).fill().map((_, i) => `${dir}/file-${i}`)

test('write files', t => {
  t.plan(paths.length * 2)
  fs.mkdirSync(dir)
  // write files
  for (const i in paths) {
    fs.writeFile(paths[i], 'content', 'ascii', er => {
      t.error(er)
      t.pass('written')
    })
  }
})

test('read files', t => {
  t.plan(paths.length * 2)
  // now read them
  for (const i in paths) {
    fs.readFile(paths[i], 'ascii', (er, data) => {
      t.error(er)
      t.equal(data, 'content')
    })
  }
})

test('cleanup', t => {
  rimraf.sync(dir)
  t.end()
})

if (fs.promises) {
  test('promise write then read files', async t => {
    t.ok(true)
    await fs.promises.mkdir(dir)
    // write files
    await Promise.all(paths.map(async (p, i) => {
      // Alternate between the three methods
      if (i % 3 === 0) {
        await fs.promises.writeFile(p, 'content', 'ascii')
      } else {
        const filehandle = await fs.promises.open(p, 'wx')
        if (i % 3 === 1) {
          await filehandle.writeFile('content', 'ascii')
        } else {
          await fs.promises.writeFile(filehandle, 'content', 'ascii')
        }

        await filehandle.close()
      }
    }))

    // now read them
    const results = await Promise.all(paths.map(async (p, i) => {
      // Alternate between the three methods
      if (i % 3 === 0) {
        return fs.promises.readFile(p, 'ascii')
      }

      let result
      const filehandle = await fs.promises.open(p, 'r')

      if (i % 3 === 1) {
        result = await filehandle.readFile('ascii')
      } else {
        result = await fs.promises.readFile(filehandle, 'ascii')
      }

      await filehandle.close()
      return result
    }))

    t.is(results.length, paths.length)
    t.ok(results.every(r => r === 'content'))
    rimraf.sync(tmpdir)
  })
}
