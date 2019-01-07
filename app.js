'use strict';

const Homey = require('homey');

class EliqPulseApp extends Homey.App {
	
	onInit() {
		this.log('EliqPulseApp is running...');
	}
	
}

module.exports = EliqPulseApp;
