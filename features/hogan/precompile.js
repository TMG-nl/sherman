#!/usr/bin/env node

var hogan = require("hogan");


process.stdin.resume();
process.stdin.setEncoding("utf8");


var template = "";

process.stdin.on("data", function(data) {
    template += data;
});

process.stdin.on("end", function() {
    var compiled = hogan.compile(template);
    process.stdout.write(compiled.r.toString().replace("function anonymous", "function") + "\n");
});
