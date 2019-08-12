'use strict'

// ENOSYS means that the fs doesn't support the op. Just ignore
// that, because it doesn't matter.
//
// if there's no getuid, or if getuid() is something other
// than 0, and the error is EINVAL or EPERM, then just ignore
// it.
//
// This specific case is a silent failure in cp, install, tar,
// and most other unix tools that manage permissions.
//
// When running as root, or if other types of errors are
// encountered, then it's strict.
function chownErFilter (er) {
  if (!er || er.code === 'ENOSYS') {
    return
  }

  const nonroot = !process.getuid || process.getuid() !== 0
  if (nonroot && (er.code === 'EINVAL' || er.code === 'EPERM')) {
    return
  }

  return er
}

module.exports = chownErFilter
