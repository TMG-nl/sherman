#!/usr/bin/env node

var less = require("less");


process.stdin.resume();
process.stdin.setEncoding("utf8");


var input = "";

process.stdin.on("data", function(data) {
    input += data;
});

process.stdin.on("end", function() {
    less.render(input, function(error, css) {
        process.stdout.write(css);
    });
});
