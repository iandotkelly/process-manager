/*jshint -W068 */

/**
 * @description Unit tests for the child.js module
 */


'use strict';

var path = require('path'),
	pmRootPath = path.join(__dirname, '../../index.js'),
	normPmPath = path.join(__dirname, '../../lib/process-manager.js'),
	covPmPath = path.join(__dirname, '../../lib-cov/process-manager.js'),
	Child = process.env.PROCESSMANAGER_COV ? require('../../lib-cov/child') : require('../../lib/child'),
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

pm.setScript('./test/fixtures/worker');

describe('Child (working script) tests.', function () {

	this.timeout(10000);

	before(function () {
		// we want to run the child script with the worker result
		process.env['PROCESSMANAGERTEST'] = 'worker';
	});

	describe('Spawn of a script', function () {

		it('Should eventually return ready and initialized', function (done) {
			var c = new Child({ readyOn: 'ready'});

			c.spawn(function (err) {
				if (err) {
					throw err;
				}

				c.worker.should.be.an.object;
				c.state.should.be.equal('initialized');

				done();
			});
		});

		describe('with a short timeout', function () {

			it('should callback with a timeout error', function (done) {
				var c = new Child({ readyOn: 'ready', timeout: 50});

				c.spawn(function (err) {
					err.should.be.an.object;
					err.message.should.be.equal('timeout forking the worker');
					c.state.should.be.equal('timedout');
					done();
				});
			});

		});
	});


	describe('Stopping a working script', function () {

		it('should move the state of the child to stopped', function (done) {
			var c = new Child({ readyOn: 'ready' });

			c.spawn(function (err) {
				if (err) {
					throw err;
				}

				c.disconnect(function () {
					c.state.should.be.equal('stopped');
					done();
				});
			});
		});

	});

	describe('replacing a working script', function () {


		it('should work', function (done) {
			var c = new Child({ readyOn: 'ready' }),
				worker = null;

			c.spawn(function (err) {
				if (err) {
					throw err;
				}
				c.worker.should.be.an.object;
				worker = c.worker;

				c.replace(function (err) {
					if (err) {
						throw err;
					}

					c.worker.should.be.an.object;
					// it should be a different worker
					c.worker.should.not.be.equal(worker);
					done();
				});
			});
		});

		it('with callback paraneter of the wrong type should throw', function () {

			var c = new Child({ readyOn: 'ready' });

			c.spawn(function (err) {
				if (err) {
					throw err;
				}

				(function () {
					c.replace(1);
				}).should.throw();


				(function () {
					c.replace('cats');
				}).should.throw();
			});
		});
	});
});
