"use strict";
if(!Thread) {
    var Thread = require("./lib/Thread.js").Thread;
}
let count = 10;
let startTime = Date.now();
for(let i = 0; i < count; i++) {
    let data = new Uint8Array(100*1024*1024);
    Thread.spawn({
	data: data,
	move: [data.buffer],
	fn: function(data, move) {
            move(data.buffer);
	    return data;
	}
    }).then(function(data) {
	console.log((Date.now() - startTime) + " ms");
    });
}

