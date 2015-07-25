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

if (require.cache[path.join(__dirname, '../../lib/signal.js')]) {
	delete require.cache[path.join(__dirname, '../../lib/signal.js')];
}
if (require.cache[path.join(__dirname, '../../lib-cov/signal.js')]) {
	delete require.cache[path.join(__dirname, '../../lib-cov/signal.js')];
}


pm = require('../..');
require('should');

describe('process-manager - on ready', function () {

	this.timeout(12000);

	before(function () {
		pm.setScript('./test/fixtures/worker');
		// we want to run the child script with the readyon result
		process.env['PROCESSMANAGERTEST'] = 'worker';
	});

	describe('.spawn', function () {

		it('with sensible options will create children', function (done) {
			pm.children.length.should.be.equal(0);
			pm.spawn({ timeout: 0, readyOn: 'ready', number: 2 }, function (err) {
				if (err) {
					throw err;
				}
				pm.children.length.should.be.equal(2);
				done();
			});

		});

		describe('and spawned children', function () {

			it('can be restarted in series', function (done) {
				pm.restart(function (err) {
					if (err) {
						throw err;
					}
					for (var index = 0; index < pm.children.length; index++) {
						pm.children[index].state.should.be.equal('initialized');
					}
					done();
				});
			});

			it('can be restarted in parallel', function (done) {
				pm.restart({ strategy: 'parallel' }, function (err) {
					if (err) {
						throw err;
					}
					for (var index = 0; index < pm.children.length; index++) {
						pm.children[index].state.should.be.equal('initialized');
					}
					done();
				});
			});

			it('can be stopped', function (done) {

				pm.stop(function (err) {
					if (err) {
						throw err;
					}

					pm.children.length.should.be.equal(2);
					for (var index = 0; index < pm.children.length; index++) {
						pm.children[index].state.should.be.equal('stopped');
					}
					done();
				});
			});
		});

	});
});
