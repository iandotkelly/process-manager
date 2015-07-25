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

describe('process-manager - on listening', function () {

	this.timeout(12000);

	describe('(before setScript called)', function () {

		describe('setScript', function () {

			it('called with bad arguments should throw', function () {

				(function () {
					pm.setScript();
				}).should.throw();

				(function () {
					pm.setScript(1);
				}).should.throw();

				(function () {
					pm.setScript(function () {});
				}).should.throw();

			});
		});
	});

	describe('(after setScript called)', function () {

		before(function () {
			pm.setScript('./test/fixtures/worker');
			// we want to run the child script with the listener result
			process.env['PROCESSMANAGERTEST'] = 'listener';
		});

		describe('module', function () {

			it('should be an object', function () {
				pm.should.be.a.object;
			});

			it('should be an event emitter', function (done) {
				pm.on('cats', function () {
					pm.removeAllListeners('cats');
					done();
				});
				pm.emit('cats');
			});
		});

		describe('.setScript', function () {


			it('cannot be called again', function () {

				(function () {
					pm.setScript('./cats.js');
				}).should.throw();

			});

		});

		describe('.spawn', function () {

			it('requires a callback', function () {

				(function () {
					pm.spawn();
				}).should.throw();

			});

			it('will throw with an invalid timeout', function () {

				(function () {
					pm.spawn({ timeout: 'fred'}, function () {});
				}).should.throw();

				(function () {
					pm.spawn({ timeout: -1});
				}).should.throw();

			});

			it('will throw with an invalid readyOn', function () {

				(function () {
					pm.spawn({ readyOn: 'cats'}, function () {});
				}).should.throw();

			});


			it('will throw with an invalid strategy', function () {

				(function () {
					pm.spawn({ strategy: 'cats'}, function () {});
				}).should.throw();

			});

			it('with sensible options will create children', function (done) {
				pm.children.length.should.be.equal(0);
				pm.spawn({ timeout: 0, readyOn: 'listening', number: 2 }, function (err) {
					if (err) {
						throw err;
					}
					pm.children.length.should.be.equal(2);
					done();
				});

			});

			it('with just a callback will create one additonal child', function (done) {
				pm.children.length.should.be.equal(2); // from previous test
				pm.spawn(function (err) {
					if (err) {
						throw err;
					}
					pm.children.length.should.be.equal(3);
					done();
				});

			});

			// ideally these would be separate tests, but I have to stop this anyway
			// to run those separate tests
			describe('and spawned children', function () {

				before(function () {
					// we want to run the child script with the listener result
					process.env['PROCESSMANAGERTEST'] = 'listener';
				});

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

						pm.children.length.should.be.equal(3);
						for (var index = 0; index < pm.children.length; index++) {
							pm.children[index].state.should.be.equal('stopped');
						}
						done();
					});
				});
			});
		});
	});
});
