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
    const QueueMap = new Map();
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
	exports.Worker.prototype.queuedMessage = null;
	exports.Worker.prototype.postQueueOrUnlock = function (key) {
	    let queue = QueueMap.get(key) || [];
	    let qm = queue.shift();
	    if(!qm) {
		return this.unlock();
	    }
	    return this.postMessage(qm.data, qm.move);
	};
	let cores = null;
	if(navigator.hardwareConcurrency) {
	    cores =  navigator.hardwareConcurrency - 1;
	} else {
	    cores = 2;
	}
	WorkerMap.setWorker = (key, worker) => {
	    let workerPool = WorkerMap.get(key) || [];
	    if(workerPool.length < cores) {
		workerPool.push(worker);
	    }
	    WorkerMap.set(key, workerPool);
	};
	WorkerMap.getFreeWorker = key => {
	    let workerPool = WorkerMap.get(key) || [];
	    if(workerPool.length < cores) {
		return null;
	    }
	    for(let worker of workerPool) {
		if(worker.isLocked() === false) {
		    return worker;
		}
	    }
	    return false;
	};
	WorkerMap.queueMessage = (fn, data, move) => {
	    let worker = createWorker(fn);
	    if(worker) {
		worker.lock();
		worker.postMessage(data, move);
	    } else {
		let key = fn.toString();
		let queue = QueueMap.get(key) || [];
		queue.push({data, move});
		QueueMap.set(key, queue);
	    }
	};
	const thread_onmessage = function onmessage(event) {
	    "use strict";
	    const move = [];
	    const message_id = event.data.message_id;
	    const fnResult = ({fnReplaceHolder}).call(null, event.data.data, transferable => {
		move.push(transferable);
	    });
	    Promise.resolve(fnResult).then(result => {
		postMessage({result, message_id}, move);		
	    }).catch(error => {throw error;});
	};
	createWorker = fn => {
	    let fnStr = fn.toString();
	    let worker = WorkerMap.getFreeWorker(fnStr);
	    if(worker === null) {
		worker = new exports.Worker(
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
		    worker.postQueueOrUnlock(fnStr);
		};
		worker.onerror = error => {
		    PromiseMap.get(message_id).reject(error);
		    PromiseMap.delete(message_id);
		    worker.postQueueOrUnlock(fnStr);
		};
		WorkerMap.setWorker(fnStr, worker);
	    }
	    return worker;
	};
    } else {
	createFunc = fn => {
	    let fnStr = fn.toString();
	    if(!FuncMap.has(fnStr)) {
		let newFn = new Function("data", '"use strict"; return (' + fnStr + ').call(null, data, transferable => transferable);');
		FuncMap.set(fnStr, newFn);
	    }
	    return FuncMap.get(fnStr);
	};	
    }
    exports.Thread = {
	spawn: function(param) {
	    let data = param.data || undefined;
	    let fn = param.fn || (input => input);
	    let move = param.move || [];
	    if(useWorker) {
		let message_id = message_id_incrementer++;
		return new Promise((resolve, reject) => {
		    PromiseMap.set(message_id, {resolve, reject});
		    WorkerMap.queueMessage(fn, {data, message_id}, move);
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
	}
    };
});
