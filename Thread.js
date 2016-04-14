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
    const FuncMap = new Map();    
    let createWorker = null;
    let createFunc = null;
    if (exports.Worker && exports.URL) {
	useWorker = true;
	exports.Worker.prototype.lockStatus = false;
	exports.Worker.prototype.isLocked = function () {
	    return this.lockStatus;
	};
	exports.Worker.prototype.lock = function () {
	    this.lockStatus = true;
	    return true;
	};
	exports.Worker.prototype.unlock = function () {
	    this.lockStatus = false;
	    return true;
	};
	let cores =  navigator.hardwareConcurrency;
	WorkerMap.setWorker = (key, worker) => {
	    let workerPool = WorkerMap.get(key) || [];
	    if(workerPool.length < cores) {
		workerPool.push(worker);
	    }
	    WorkerMap.set(key, workerPool);
	};
	WorkerMap.getFreeWorker = key => {
	    let workerPool = WorkerMap.get(key) || [];
	    for(let worker of workerPool) {
		if(worker.isLocked() === false) {
		    return worker;
		}
	    }
	    return null;
	};
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
	    if(!WorkerMap.getFreeWorker(fnStr)) {
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
		    worker.unlock();
		};
		worker.onerror = error => {
		    PromiseMap.get(message_id).reject(error);
		    PromiseMap.delete(message_id);
		    worker.unlock();
		};
		WorkerMap.setWorker(fnStr, worker);
		return worker;
	    }
	    return WorkerMap.getFreeWorker(fnStr);
	};
    } else {
	createFunc = fn => {
	    let fnStr = fn.toString();
	    if(!FuncMap.has(fnStr)) {
		let newFn = new Function("data", '"use strict"; return (' + fnStr + ').call(null, data, transferable => transferable);');
		FuncMap.set(fnStr, newFn);
	    }
	    return FuncMap.get(fnStr);
	}
	
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
		    worker.lock();
		    if(!!move) {
			worker.postMessage({data, message_id}, move);
		    } else {
			worker.postMessage({data, message_id});
		    }
		});
	    } else {
		return new Promise((resolve, reject) => {
		    try {
			resolve(createFunc(fn).call(null, data));
		    } catch(error) {
			reject(error);
		    }
		});
	    }
	},
    };
});
