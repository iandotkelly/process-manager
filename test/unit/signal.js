/**
 * @description Unit tests for the child.js module
 */

'use strict';


var path = require('path'),
	pmRootPath = path.join(__dirname, '../../index.js'),
	normPmPath = path.join(__dirname, '../../lib/process-manager.js'),
	covPmPath = path.join(__dirname, '../../lib-cov/process-manager.js'),
	signal,
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

signal =  require('../..').signal;

require('should');

describe('signal', function () {

	// todo better testing

	it('should be an object', function () {
		signal.should.be.an.object;
	});

	describe('.ready', function () {

		it('should be a method', function () {
			signal.ready.should.be.a.function;
		});

		it('should not throw an exception if run from master', function () {
			assert.doesNotThrow(
				function () {
					signal.ready();
				},
				'should not throw an exception'
			);
		});

		// todo work out how to test the signal method - cannot be run from a master
		// might have to execute another process


	});

});
