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
    let useWorker = false;
    let message_id_incrementer = 0;
    const WorkerMap = new Map();
    const PromiseMap = new Map();
    let createWorker = null;
    if (exports.Worker && exports.URL) {
	useWorker = true;
	const thread_onmessage = function onmessage(event) {
	    "use strict";
	    const move = [];
	    const message_id = event.data.message_id;
	    const fnResult = ({fnReplaceHolder}).call(null, event.data.data, transferable => {
		move.push(transferable);
	    });
	    Promise.resolve(fnResult).then(result => {
		if(move.length > 0) {
		    postMessage({result, message_id}, move);		
		} else {
		    postMessage({result, message_id});
		}
	    }).catch(error => {throw error;});
	};
	createWorker = fn => {
	    let fnStr = fn.toString();
	    if(!WorkerMap.has(fnStr)) {
		let worker = new exports.Worker(
		    exports.URL.createObjectURL(
			new Blob([
			    "onmessage = " + thread_onmessage.toString().replace(/{fnReplaceHolder}/, fnStr)
			])
		    )
		);
		worker.onmessage = event => {
		    let message_id = event.data.message_id;
		    PromiseMap.get(message_id).resolve(event.data.result);
		    PromiseMap.delete(message_id);
		};
		worker.onerror = error => {
		    PromiseMap.get(message_id).reject(error);
		    PromiseMap.delete(message_id);
		};
		WorkerMap.set(fnStr, worker);
	    }
	    return WorkerMap.get(fnStr);
	};
    }
    exports.Thread = {
	spawn: function({
	    data = null,
	    fn = val => val,
	    move = null
	}) {
	    if(useWorker) {
		let message_id = message_id_incrementer++;
		return new Promise((resolve, reject) => {
		    PromiseMap.set(message_id, {resolve, reject});
		    let worker = createWorker(fn);
		    if(!!move) {
			worker.postMessage({data, message_id}, move);
		    } else {
			worker.postMessage({data, message_id});
		    }
		});
	    } else {
		return new Promise((resolve, reject) => {
		    try {
			resolve(fn.call(null, data, dummy => dummy));
		    } catch(error) {
			reject(error);
		    }
		});
	    }
	},
    };
});
