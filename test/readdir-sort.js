var fs = require("fs")

var readdir = fs.readdir
fs.readdir = function(path, options, cb) {
  process.nextTick(function() {
    cb(null, ["b", "z", "a"])
  })
}

var g = require("../")
var test = require("tap").test

test("readdir reorder", function (t) {
  g.readdir("whatevers", function (er, files) {
    if (er)
      throw er
    t.same(files, [ "a", "b", "z" ])
    t.end()
  })
})
