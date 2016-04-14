# {package}

## What is {package}
{package} is a lightweight thread api with Promise

## How to use it
### with chrome/firefox

	Thread.spawn({
		data: data,
		fn: function(data, move) {
			console.log(data);
		    return data;
		}
	}).then(function(result) {
		console.log(result);
	});

### with nodejs

	var Thread = require("./Thread.js").Thread;

	Thread.spawn({
		data: data,
		fn: function(data, move) {
			console.log(data);
		    return data;
		}
	}).then(function(result) {
		console.log(result);
	});

run example from node
	
	$ node --harmony_destructuring --harmony_modules example.js

### get it faster
use move option

	"use strict";
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

