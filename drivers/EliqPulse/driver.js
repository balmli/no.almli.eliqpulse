'use strict';

const Homey = require('homey');

class EliqPulseDriver extends Homey.Driver {

    onInit() {
        this.log('EliqPulseDriver driver has been initialized');
    }

    onPairListDevices(data, callback) {
        let devices = [
            {
                "name": "EliqPulse",
                "data": {"id": "EliqPulse"}
            }
        ];
        callback(null, devices);
    }

}

module.exports = EliqPulseDriver;
