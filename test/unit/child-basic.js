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
	pm,
	assert = require('assert');

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
pm.setMaxListeners(15);

describe('Child tests', function () {

	this.timeout(5000);

	before(function () {
		// we want to run the child script with the worker result
		process.env['PROCESSMANAGERTEST'] = 'worker';
	});

	describe('constructor', function () {

		it('should be a method', function () {
			Child.should.be.a.function;
		});

		it('should return default initialized object with no options', function () {
			var c = new Child();

			c.should.be.an.object;
			assert.strictEqual(null, c.worker);
			c.timeout.should.be.equal(0);
			c.state.should.be.equal('new');
			c.backoff.should.be.an.object;
			c.readyOn.should.be.equal('listening');
			c.disconnectTimeout.should.be.equal(2000);
		});

		it('should return initialized object with options', function () {
			var c = new Child({ readyOn: 'ready', timeout: 10000 });

			c.should.be.an.object;
			assert.strictEqual(null, c.worker);
			c.timeout.should.be.equal(10000);
			c.state.should.be.equal('new');
			c.backoff.should.be.an.object;
			c.readyOn.should.be.equal('ready');
		});

		it('with a bad value for timeout should throw an error', function () {
			/* jshint nonew: false */
			(function () {
				new Child({ timeout: 'fred' });
			}).should.throw();

			(function () {
				new Child({ timeout: -1 });
			}).should.throw();
		});


		it('with a bad value for readyOn should throw an error', function () {
			/* jshint nonew: false */

			(function () {
				new Child({ readyOn: 'fred' });
			}).should.throw();

			(function () {
				new Child({ readyOn: -1 });
			}).should.throw();

			(function () {
				new Child({readyOn: function () {} });
			}).should.throw();
		});

	});


	describe('on', function () {

		it('should be able to emit events - e.g. the log event', function (done) {

			var c = new Child(),
				f = function (message) {
					message.should.be.equal('cats');
					done();
				};

			c.on('log', f);
			// check that we can emit a log event
			c.emit('log', 'cats');
		});
	});


});
