/*jshint -W068 */

/**
 * @description Unit tests for the child.js module
 */

'use strict';


var Backoff = process.env['PROCESSMANAGER_COV']
	? require('../../lib-cov/backoff')
	: require('../../lib/backoff');

require('should'),

describe('Backoff', function () {

	describe('constructor', function () {

		it('should be a method', function () {
			Backoff.should.be.a.function;
		});

		it('should return initialized object with default parameters', function () {
			var b = new Backoff();

			b.should.be.an.object;
			b.startMs.should.be.equal(100);
			b.maxMs.should.be.equal(60000);
			b.multiplier.should.be.equal(2);
			b.currentDelayMs.should.be.equal(0);
		});

		it('with an options object should set parameters', function () {

			var b = new Backoff({
				startMs: 53,
				maxMs: 999,
				multiplier: 15
			});

			b.should.be.an.object;
			b.startMs.should.be.equal(53);
			b.maxMs.should.be.equal(999);
			b.multiplier.should.be.equal(15);
			b.currentDelayMs.should.be.equal(0);
		});

		it('with an argument of the wrong type should throw', function () {
			/*jshint nonew: false */
			(function () {
				new Backoff(1);
			}).should.throw();

			(function () {
				new Backoff('cats');
			}).should.throw();

			(function () {
				new Backoff(function () {});
			}).should.throw();
		});
	});


	describe('backoff method with defaults', function () {

		var b = new Backoff();

		it('when called without a calback function should throw', function () {

			(function () {
				b.backoff();
			}).should.throw();

			(function () {
				b.backoff(1);
			}).should.throw();

			(function () {
				b.backoff('cats');
			}).should.throw();

		});

		it('when called the first time should run immediately', function (done) {

			var start = new Date();

			b.backoff(function () {
				var end = new Date(),
					elapsed = end.getTime() - start.getTime();

				// the delay should be short (e.g. < 5ms)
				elapsed.should.be.lessThan(5);
				done();
			});

		});

		it('when called the second time should be 100 or more ms later',
			function (done) {

			var start = new Date();

			b.backoff(function () {
				var end = new Date(),
					elapsed = end.getTime() - start.getTime();

				// the delay should be at least 100ms
				elapsed.should.be.greaterThan(97);
				elapsed.should.be.lessThan(110);
				done();
			});

		});

		it('when called the third time should be 200 or more ms later',
			function (done) {

			var start = new Date();

			b.backoff(function () {
				var end = new Date(),
					elapsed = end.getTime() - start.getTime();

				// the delay should be around 200ms
				elapsed.should.be.greaterThan(197);
				elapsed.should.be.lessThan(210);
				done();
			});

		});


		it('when called the third time should be 400 or more ms later',
			function (done) {

			var start = new Date();

			b.backoff(function () {
				var end = new Date(),
					elapsed = end.getTime() - start.getTime();

				// the delay should be around 400ms
				elapsed.should.be.greaterThan(397);
				elapsed.should.be.lessThan(410);
				done();
			});

		});

		it('when reset is called, the backoff shound return to 0 ', function (done) {

			var start = new Date();
			b.reset();
			b.backoff(function () {
				var end = new Date(),
				elapsed = end.getTime() - start.getTime();

				// the delay should be short (e.g. < 5ms)
				elapsed.should.be.lessThan(5);
				done();
			});

		});
	});

	describe('backoff method with multipier of 3, startMs of 50ms and maxMs of 200ms', function () {

		var b = new Backoff({ startMs: 50, maxMs: 200, multiplier: 3 });

		it('when called the first time should run immediately', function (done) {

			var start = new Date();

			b.backoff(function () {
				var end = new Date(),
					elapsed = end.getTime() - start.getTime();

				// the delay should be short (e.g. < 5ms)
				elapsed.should.be.lessThan(5);
				done();
			});

		});

		it('when called the second time should be 50 or more ms later', function (done) {

			var start = new Date();

			b.backoff(function () {
				var end = new Date(),
					elapsed = end.getTime() - start.getTime();

				// the delay should be around 50
				elapsed.should.be.greaterThan(47);
				elapsed.should.be.lessThan(60);
				done();
			});

		});


		it('when called the third time should be 150 or more ms later', function (done) {

			var start = new Date();

			b.backoff(function () {
				var end = new Date(),
					elapsed = end.getTime() - start.getTime();

				// the delay should be at least 150ms
				elapsed.should.be.greaterThan(147);
				elapsed.should.be.lessThan(160);
				done();
			});

		});


		it('when called the fourth time should be 200 or more ms later', function (done) {

			var start = new Date();

			b.backoff(function () {
				var end = new Date(), elapsed = end.getTime() - start.getTime();

				// the delay should be around 200ms
				elapsed.should.be.greaterThan(197);
				elapsed.should.be.lessThan(210);
				done();
			});

		});


		it('when called the fifth time should still be 200 or more ms later', function (done) {

			var start = new Date();

			b.backoff(function () {
				var end = new Date(),
					elapsed = end.getTime() - start.getTime();

				// the delay should be at least 200ms
				elapsed.should.be.greaterThan(197);
				elapsed.should.be.lessThan(210);
				done();
			});

		});

	});



	describe('backoff method with a start and max above 30 days', function () {

		var b = new Backoff({ startMs: 2593000000, maxMs: 2593000000, multiplier: 2 });

		it('should set the start and max to 30 days', function () {

			b.startMs.should.be.equal(2592000000);
			b.maxMs.should.be.equal(2592000000);

		});

	});
});
