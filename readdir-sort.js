'use strict'

const {Dirent} = require('fs')

module.exports = files => {
  if (!files || files.length === 0) {
    return files
  }

  if (typeof files[0] === 'object' && files[0].constructor === Dirent) {
    if (typeof files[0].name === 'string') {
      return files.sort((a, b) => a.name.localeCompare(b.name))
    }

    return files.sort((a, b) => a.name.toString().localeCompare(b.name.toString()))
  }

  return files.sort()
}
