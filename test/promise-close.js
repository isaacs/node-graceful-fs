'use strict'

const fs = require('fs')
const {promisify} = require('util')
const t = require('tap')
const {enqueue} = require('../retry-queue.js')

const promises = Object.getOwnPropertyDescriptor(fs, 'promises')
const delay = promisify(setTimeout)

if (!promises) {
  t.pass('nothing to do')
  process.exit(0)
}

const gfs = require('./helpers/graceful-fs.js')

let hit = false
const retryHit = () => {
  hit = true
}

const enqueueHit = () => enqueue([retryHit, []])

function testHits (msg) {
  t.ok(hit, msg)
  hit = false
}

async function testFunction () {
  await delay(0)
  enqueueHit()

  if (!promises.enumerable) {
    hit = false
    // Force initialization of promises
    gfs.promises
  }

  await delay(50)
  testHits('gfs.promises close initialization did retry')

  enqueueHit()
  let filehandle = await gfs.promises.open(__filename)
  t.notOk(hit, 'gfs.promises.open delays retry')
  await delay(0)
  testHits('gfs.promises.open retry on nextTick')

  enqueueHit()
  await filehandle.close()
  testHits('filehandle.close caused immediate retry')

  if (!process.env.TEST_GFS_GLOBAL_PATCH) {
    enqueueHit()
    filehandle = await fs.promises.open(__filename)
    t.notOk(hit, 'no retry from fs.promises.open')
    await delay(0)
    t.notOk(hit, 'fs.promises.open no retry on nextTick')

    await filehandle.close()
    testHits('filehandle.close caused immediate retry')
  }
}

t.resolves(testFunction(), 'test function resolves')
  .then(() => t.end())
  .catch(error => {
    console.error(error)
    t.fail()
  })
