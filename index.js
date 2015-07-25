module.exports = process.env.PROCESSMANAGER_COV
	? require('./lib-cov/process-manager')
	: require('./lib/process-manager');
