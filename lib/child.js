/**
 * @description Manage a single worker process
 * @author Ian Kelly
 *
 * @copyright Copyright (C) Ian Kelly
 * @license  MIT
 */

'use strict';

var cluster = require('cluster'),
	Backoff = require('./backoff'),
	EventEmitter = require('events').EventEmitter,
	inherits = require('util').inherits;

// make the Child an EventEmitter
inherits(Child, EventEmitter);

/**
 * Sets the default options for the configuration object
 * 
 * @param	{Object} options	The options object
 * @returns {Object}			Options with defaults set
 */
function setDefaults(options) {

	options = options || {};
	options.timeout = options.timeout || 0;  // no timeout
	options.readyOn = options.readyOn || 'listening';
	options.confirmTimeout = options.confirmTimeout || 2000;
	options.disconnectTimeout = options.disconnectTimeout || 2000;

	return options;
}

/**
 * Constructor
 * 
 * @param {String} script  Path to the script file to run
 */
function Child(options) {

	options = setDefaults(options);

	// timeout must be 0 or greater
	if (typeof options.timeout !== 'number' || options.timeout < 0) {
		throw new Error('options.timeout must be 0 or greater');
	}

	// readyOn must be 'listening' or 'ready'
	if (typeof options.readyOn !== 'string' ||
		(options.readyOn !== 'listening' && options.readyOn !== 'ready')) {
		throw new Error('options.readyOn must either be "listening" or "ready');
	}


	// a restart timer - exponential back off
	this.backoff = new Backoff(
		{
			startMs: 200,
			maxMs: 120000,
			multiplier: 2
		});

	// the cluster worker object
	this.worker = null;

	// standard timeout for spawning
	this.timeout = options.timeout;

	// state
	this.state = 'new';

	// how should we determine what 'ready' means
	this.readyOn = options.readyOn;

	// time after ready/listening to confirm we are working
	this.confirmTimeout = options.confirmTimeout;

	// time to wait for disconnect to happen
	this.disconnectTimeout = options.disconnectTimeout;
}

/**
 * Utility function for logging from this child
 * 
 * @param  {Any} message The thing to log
 */
Child.prototype.log = function (message) {
	this.emit('log', message);
};

/**
 * Utility function to report status events
 * 
 * @param  {Object} status The status message
 */
Child.prototype.report = function (status) {
	this.emit('status', status);
};

/**
 * Spawn a process from this child
 *
 * If you do this more than once, more than one process will be created
 * but only one will be managed by this module
 * 
 * @param  {Function} callback  Callback when child is instantiated
 *                              or a timeout occurs
 */
Child.prototype.spawn = function (callback) {

	callback = callback || function () {};

	if (typeof callback !== 'function') {
		throw new Error('callback must be a function');
	}

	var self = this,
		worker,
		readyHandler,
		timeout;

	this.log('Child process: spawn worker command received');
	this.report({ event: 'spawn' });

	// fork the worker
	self.state = 'new';
	worker = cluster.fork();
	this.worker = worker;

	// handler for the timeout
	if (this.timeout > 0) {

		timeout = setTimeout(function () {

			if (self.state === 'new') {
				self.log('Child process: Timeout when forking the worker, worker ID: '
					+ self.worker.id);
				self.state = 'timedout';
				callback(new Error('timeout forking the worker'));
			}
		}, this.timeout);
	}

	if (this.readyOn === 'listening') {

		// we are just waiting for the listening evet once
		worker.once('listening', function () {
			clearTimeout(timeout);
			self.log('Child process: Worker listening event received, worker ID: '
				+ self.worker.id);
			if (self.state === 'new') {
				self.state = 'initialized';
				// timeout to make sure the process is still going
				setTimeout(function () {
						if (self.worker && self.worker.process.connected) {
							callback(null);
						} else {
							callback(new Error('process disconnected at 2 seconds'));
						}
					}, self.confirmTimeout);
			}
		});

	} else {

		readyHandler = function (message) {
			if (message.cmd && message.cmd === 'ready') {
				clearTimeout(timeout);
				self.log('Child process: Worker ready message received, worker ID: '
					+ self.worker.id);
				self.worker.removeListener('message', readyHandler);
				if (self.state === 'new') {
					self.state = 'initialized';
					// timeout to make sure the process is still going
					setTimeout(function () {
						if (self.worker && self.worker.process.connected) {
							callback(null);
						} else {
							callback(new Error('process disconnected at 2 seconds'));
						}
					}, self.confirmTimeout);
				}
			}
		};

		// we need to handle ready messages - cannot use 'once' for this as
		// the process may emit more messages that we are not expecting
		worker.on('message', readyHandler);
	}
};



/**
* Disconnect and kill the worker
* 
* @param  {Function} callback Callback when disconnection complete
*                             or timeout occurs
*/
Child.prototype.disconnect = function (callback) {

	var self = this,
		timeout;

	callback = callback || function () {};

	if (this.worker && this.worker.process.connected) {

		// we have a timeout in case disconnecting does not kill us
		timeout = setTimeout(function () {
			self.log('Child process: forced to kill worker, worker ID: '
				+ self.worker.id);
			self.state = 'killed';
			self.worker.kill();
			callback(null);
		}, this.disconnectTimeout);

		// attach temporary listeners to attend to the worker dying
		this.worker.once('exit', function () {
			clearTimeout(timeout);
			self.log('Child process: replaced worker exited, worker ID: '
				+ self.worker.id);
			self.state = 'stopped';
			callback(null);
		});

		// disconnect
		this.worker.disconnect();
		// inform process that disconnect has happened
		this.worker.process.send({cmd: 'disconnecting'});

		this.log('Child process: worker disconnecting, worker ID: ' + this.worker.id);

	} else {

		callback(null);

	}
};

/**
 * Replace the worker this child is managing,
 * creating new worker *before* disconnecting old
 * 
 * @param  {Function} callback Callback when new worker is ready
 */
Child.prototype.replace = function (callback) {

	callback = callback || function () {};

	if (typeof callback !== 'function') {
		throw new Error('callback must be a function');
	}

	var self = this,
		oldWorker = this.worker;

	// spawn the new worker
	this.spawn(function (err) {
		if (err) {
			return callback(err);
		}

		// we have a timeout in case disconnecting does not kill us
		var timeout = setTimeout(function () {
			self.log('Child process: forced to kill worker, worker ID: '
				+ oldWorker.id);
			oldWorker.kill();
		}, self.disconnectTimeout);

		// attach temporary listeners to attend to the worker dying
		oldWorker.once('exit', function () {
			clearTimeout(timeout);
			self.log('Child process: replaced worker exited, worker ID: '
				+ oldWorker.id);
		});

		// disconnect
		oldWorker.disconnect();
		// inform process that disconnect has happened
		oldWorker.process.send({cmd: 'disconnecting'});

		self.log('Child process: worker disconnecting, worker ID: ' + oldWorker.id);
		callback(null);
	});
};


module.exports = Child;