/**
 * @description Module for Process Manager
 *
 * @author Ian Kelly
 * @copyright Copyright (C) Ian Kelly 2013
 *
 * @license  MIT
 */

'use strict';

var cluster = require('cluster'),
	Child = require('./child'),
	async = require('async'),
	signal = require('./signal'),
	EventEmitter = require('events').EventEmitter,
	pm = new EventEmitter(),
	scriptSet = false;

pm.setScript = setScript;
pm.spawn = spawn;
pm.restart = restart;
pm.stop = stop;
pm.signal = signal;
pm.children = [];


// set up worker exit handler
cluster.on('exit', function (worker, code, signal) {

	var index, child;

	// look for the child dealing with this
	for (index = pm.children.length - 1; index >= 0; index--) {

		child = pm.children[index];

		if (child.worker && child.worker.id === worker.id) {
			handleExit(child, worker, code, signal);
			break;
		}
	}
});

/**
 * Handles an 'exit' event from a worker cluster module
 *
 * @param  {Object} child  The child object receiving this event
 * @param  {Object} worker The associated worker
 * @param  {Number} code   The exit code
 * @param  {String} signal The signal
 */
function handleExit(child, worker, code, signal) {

	logMessage('Process Manager: worker exit event received, worker ID: '
		+ worker.id);

	child.state = 'stopped';

	var status = {
		event: 'exit',
		id: worker.id,
		code: code,
		signal: signal
	};

	if (worker.suicide) {
		status.event = 'suicide';
		pm.emit('status', status);
		logMessage('               worker committed suicide');
	} else {
		pm.emit('status', status);
		if (signal) {
			logMessage('               worker was killed by signal: ' + signal);
		} else {
			logMessage('               worker exited ' +
				(code === 0) ? 'without error' : 'with error code ' + code);
		}

		if (code !== 0) {
			logMessage('Process Manager: attempting to start replacement worker in '
				+ child.backoff.currentDelayMs + 'ms');
			// attempt to respawn this
			child.backoff.backoff(function () {
				child.spawn(function () {});
			});
		}
	}
}


/**
 * Log messages
 *
 * @param  {Varies} message Log message - string, number etc.
 */
function logMessage(message) {
	pm.emit('log', message);
}

/**
 * Emit a status event
 * @param  {[type]} status [description]
 * @return {[type]}        [description]
 */
function emitStatus(status) {
	pm.emit('status', status);
}

/**
 * Creates new child objects
 *
 * @param  {Options} options The spawn options object
 * @return {Array}           An array of initialized new child objects
 */
function createNewChildren(options) {

	var created = [],
		index,
		child;

	for (index = 0; index < options.number; index++) {
		child = new Child(
			{
				timeout: options.timeout,
				readyOn: options.readyOn
			});
		child.on('log', logMessage);
		child.on('status', emitStatus);
		created.push(child);
	}

	return created;
}

/**
 * Parses the options for the spawn method
 *
 * @param  {Object} options An options object
 * @return {Object}         The options object with default values added
 */
function checkOptions(options) {
/* jshint maxcomplexity: 9 */

	options = options || {};
	options.number = options.number || 1;
	options.strategy = options.strategy || 'series';
	options.timeout = options.timeout || 0;
	options.readyOn = options.readyOn || 'listening';
	options.confirmTimeout = options.confirmTimeout || 2000;

	if (options.strategy !== 'series' && options.strategy !== 'parallel') {
		throw new Error('options.strategy must be either "series" or "parallel"');
	}

	if (options.readyOn !== 'listening' && options.readyOn !== 'ready') {
		throw new Error('options.readyOn must be either "listening" or "ready"');
	}

	return options;
}

/**
 * Set the script to use.  If this is not used, will default to __filename
 *
 * @param {String} script A name of a script that cluster can resolve
 */
function setScript(script) {

	if (!cluster.isMaster) {
		throw new Error('a child process cannot run pm.setScript()');
	}

	if (scriptSet === true) {
		throw new Error('you cannot run setChildScript more than once');
	}

	if (typeof script !== 'string') {
		throw new Error('script must be a string');
	}

	// set up the script
	cluster.setupMaster({ exec: script });
	logMessage('Process Manager: child script set to: "' + script + '"');

	scriptSet = true;
}

/**
 * Spawn one or more child processes
 *
 * @param  {Object}   options  [Optional] options object
 * @param  {Function} callback Callback
 */
function spawn(options, callback) {
	/* jshint maxstatements:16 */

	// this cannot be run from anything other than the master process
	if (!cluster.isMaster) {
		throw new Error('a child process cannot run pm.spawn()');
	}

	if (typeof options === 'function' && !callback) {
		callback = options;
		options = {};
	}

	if (!callback) {
		throw new Error('must have a callback');
	}

	// check the options
	options = checkOptions(options);

	var optionsString,
		spawning,
		eachFn;

	try {
		optionsString = JSON.stringify(options);
	} catch (err) {
		optionsString = '(invalid options object)';
	}

	logMessage('Process Manager: spawning child processes\n'
		+ '                 options: ' + optionsString);

	// create an array of new children objects
	spawning = createNewChildren(options);

	// choose spawning strategy - parallel or series
	eachFn = options.strategy === 'parallel' ? async.each : async.eachSeries;

	// add that array to the master list
	pm.children = pm.children.concat(spawning);

	// spawn the new workers
	eachFn(
		spawning,
		function (child, next) {
			child.spawn(next);
		},
		function (err) {
			if (err) {
				callback(err);
			}
			logMessage('Process Manager: spawn child processes complete');
			callback(null);
		}
	);
}

/**
 * Restart all the current children
 *
 * @param  {Object}   options  Options object
 * @param  {Function} callback Callback when all the children restarted
 */
function restart(options, callback) {

	if (!callback && typeof options === 'function') {
		callback = options;
		options = {};
	}

	// default to a series restart
	options = options || {};
	options.strategy = options.strategy || 'series';
	options.readyOn = options.readyOn || 'listening';

	var optionsString,
		eachFn;

	try {
		optionsString = JSON.stringify(options);
	} catch (err) {
		optionsString = '(invalid options object)';
	}

	logMessage('Process Manager: restarting all child processes\n'
		+ '                 options: ' + optionsString);

	eachFn = options.strategy === 'parallel' ? async.each : async.eachSeries;

	eachFn(
		pm.children,
		function (child, next) {
			child.replace(next);
		},
		function (err) {
			if (err) {
				callback(err);
			}
			logMessage('Process Manager: restarted all child worker processes');
			callback(null);
		}
	);
}

/**
 * Stop all the current children
 *
 * @param  {Function} callback Callback when all the children stopped
 */
function stop(callback) {

	logMessage('Process Manager: disconnecting all cluster worker processes.');

	async.each(
		pm.children,
		function (child, next) {
			child.disconnect(next);
		},
		function (err) {
			if (err) {
				callback(err);
			}
			logMessage('Process Manager: all child processes exited.');
			callback(null);
		}
	);
}


module.exports = pm;
