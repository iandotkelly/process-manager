/**
 * @description Convenience methods for singnalling between child and parent
 * @author Ian Kelly
 *
 * @copyright Copyright (C) Ian Kelly 2013
 * @license  MIT
 */

'use strict';

/**
 * Send a ready message - used to signal child is initialized
 */
function ready() {
	if (process.send) {
		process.send({ cmd: 'ready' });
	}
}

module.exports = {
	ready: ready
};