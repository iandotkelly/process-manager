'use strict';


var path = require('path'),
	pmRootPath = path.join(__dirname, '../../index.js'),
	normPmPath = path.join(__dirname, '../../lib/process-manager.js'),
	covPmPath = path.join(__dirname, '../../lib-cov/process-manager.js'),
	signal,
	testType = process.env['PROCESSMANAGERTEST'],
	chatty = process.env['PROCESSMANAGERTESTCHATTY'] === 'true',
	http = require('http');

// make sure no pre-existing process-manager is in the cache
if (require.cache[covPmPath]) {
	delete require.cache[covPmPath];
}

if (require.cache[normPmPath]) {
	delete require.cache[normPmPath];
}

if (require.cache[pmRootPath]) {
	delete require.cache[pmRootPath];
}

signal = require('../..').signal;

if (!testType) {
	throw new Error('No test type defined');
}

if (chatty) {
	switch (testType) {
	case 'worker':
		console.log('Hi, I\'m a Worker');
		break;
	case 'listener':
		console.log('Hi, I\'m a Listener');
		break;
	case 'broken':
		console.log('Hi, I\'m broken');
		break;
	default:
		console.log('Unexpected testType ' + testType);
	}
}

function wait(callback) {
	setTimeout(callback, 40);
}

wait(function () {
	if (chatty) {
		console.log('step 1');
	}

	wait(function () {
		if (chatty) {
			console.log('step 2');
		}

		wait(function () {
			if (chatty) {
				console.log('step 3');
			}

			wait(function () {
				/* jshint maxcomplexity:10 */

				switch (testType) {
				case 'worker':
					if (chatty) {
						console.log('ready');
					}
					signal.ready();
					break;
				case 'listener':
					if (chatty) {
						console.log('about to listen');
					}
					try {
						http.createServer(function () {
							// do nothing
						}).listen();
					} catch (err) {}
					break;
				case 'broken':
					if (chatty) {
						console.log('about to throw an excepton');
					}
					throw new Error('oops');
				case 'badexit':
					// signal that we are ready
					signal.ready();
					// but die in 3 seconds
					setTimeout(function () {
						if (chatty) {
							console.log('about to exit with code 1');
						}
						process.exit(1);
					}, 5000);
				}
			});
		});
	});
});
