/**
 * @singleton
 * @aside guide thread
 * @author Copyright (c) 2016 Chen Han. All rights reserved
 *
 * @description
 *
 * ## Examples
 * ###
 * @example
 */
(function (root, factory) {
    if (typeof exports === 'object') {
        factory(exports);
    } else if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    } else {
        factory(root);
    }
})(this, function(exports) {
    //Thread
    "use strict";
    if (!exports.Worker || !exports.URL) {
        console.log("お使いのブラウザが古すぎるため、並列処理ができません");
        return false;
    }
    const workerMap = new Map();
    const thread_onmessage = function onmessage(event) {
	"use strict";
	const move = [];
	const fnResult = ({fnReplaceHolder}).call(null, event.data, (transferable) => {
	    move.push(transferable);
	});
	Promise.resolve(fnResult).then(function(result) {
	    if(move.length > 0) {
		postMessage(result, move);		
	    } else {
		postMessage(result);
	    }
	}).catch(function(error) {
	    throw error;
	});
    };
    const createWorker = function(fn) {
	let fnStr = fn.toString();
	if(!workerMap.has(fnStr)) {
	    workerMap.set(fnStr, new exports.Worker(
		exports.URL.createObjectURL(
		    new Blob([
			"onmessage = " + thread_onmessage.toString().replace(/{fnReplaceHolder}/, fnStr)
		    ])
		)
	    ));
	}
	return workerMap.get(fnStr);
    };
    
    exports.Thread = {
	spawn: function({
	    data = null,
	    fn = val => val,
	    move = null,
	    delay = 0}) {
	    let promise = new Promise(function (resolve, reject) {
		var worker = createWorker(fn);
		worker.onmessage = function(event) {
		    resolve(event.data);
		};
		worker.onerror = reject;
		if(!!move) {
		    worker.postMessage(data, move);			
		} else {
			worker.postMessage(data);
		}
	    });
	    return promise;
	}
    };
});
