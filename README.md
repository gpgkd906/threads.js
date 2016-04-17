# thread.js

## What is thread.js
threads is a lightweight thread api with es6 syntax.  
and when you with the latest Chrome/Firefox/Edge, it use WebWorker to **free boost** your application with extra processor.  
(safari do not support let/const syntax yet so it throw errors, but you can rewrite it to use var syntax--just a little work, if you want.)

## How to use it

you could not to be confusion.  
there is only one api: **Thread.spawn**   
Thread.spawn receives only one parameter, an object like  

```
{
	data: data,
	move: [tansferable],
	fn: function (data) {},
}
```
and returns a **Promise** object.
###Notice
which **fn** you give will be run in an **Standalone environment**, so you can not refer to your main context inside the fn.

### with chrome/firefox
```html
<script src="lib/Thread.js"></script>
```
```javascript
Thread.spawn({
	data: data,
	fn: function(data) {
		 "use strict";
		 let result = data;
	    return result;
	}
}).then(function(result) {
	console.log(result);
});
```

### with nodejs

```javascript
var Thread = require("threads.js").Thread;

Thread.spawn({
	data: data,
	fn: function(data) {
		"use strict";
		let result = data;
   		return result;
	}
}).then(function(result) {
	console.log(result);
});
```

run example from node
	
	$ node --harmony_destructuring example.js

### get it faster with browser
use move option to transfer big data without copy-cost.  
[Transferable](https://developer.mozilla.org/en-US/docs/Web/API/Transferable)

```javascript
"use strict";
let count = 10;
let startTime = Date.now();
for(let i = 0; i < count; i++) {
    let data = new Uint8Array(10*1024*1024);
    Thread.spawn({
		data: data,
		move: [data.buffer],
		fn: function(data, move) {
			"use strict";
			for(let i in data) {
				//do something
			}
			move(data.buffer);
			let result = data;
	 	  	return result;
		}
    }).then(function(result) {
		console.log((Date.now() - startTime) + " ms");
    }).catch(error => {
    	console.log(error);
    });
}
```

#What is next?
I will replace prototype to Class when Chrome/Firefox/Safari/Edge is ready.  
and other es6(or es7?) syntax when at least 2 browser support it.

#Issue
Anything will be receive, please tell me.

#License
Licensed under the [MIT License](https://opensource.org/licenses/MIT).