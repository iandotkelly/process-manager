/*jshint -W068 */

/**
 * @description Unit tests for the process-manager.js module
 */


'use strict';

var path = require('path'),
	pmRootPath = path.join(__dirname, '../../index.js'),
	normPmPath = path.join(__dirname, '../../lib/process-manager.js'),
	covPmPath = path.join(__dirname, '../../lib-cov/process-manager.js'),
	pm;

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

pm = require('../..');
require('should');

describe('process-manager with a script that will exit every 5 seconds', function () {

	var exits = [], spawnCount = 0;

	this.timeout(12000);

	// count exits
	pm.on('status', function (status) {
		if (status.event === 'spawn') {
			spawnCount++;
		} else if (status.event === 'exit') {
			exits.push(status);
		}
	});

	before(function () {
		pm.setScript('./test/fixtures/worker');
		// we want to run the child script with the listener result
		process.env['PROCESSMANAGERTEST'] = 'badexit';
	});

	it('will force the failing script to restart', function (done) {
		pm.children.length.should.be.equal(0);
		exits.length.should.be.equal(0);
		spawnCount.should.be.equal(0);
		pm.spawn({ timeout: 0, readyOn: 'ready', number: 1 }, function (err) {
			if (err) {
				throw err;
			}
			spawnCount.should.be.equal(1);
			pm.children.length.should.be.equal(1);
			exits.length.should.be.equal(0);

			// wait 6 seconds for it to fail
			setTimeout(function () {
				exits.length.should.be.equal(1);
				exits[0].id.should.be.equal(1);
				exits[0].event.should.be.equal('exit');
				exits[0].code.should.be.equal(1);
				spawnCount.should.be.equal(2);
				done();
			}, 6000);
		});
	});


});
