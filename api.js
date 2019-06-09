'use strict';

const Homey = require('homey');

function getMeasurePower() {
    let measurePower = undefined;
    Object.keys(Homey.ManagerDrivers.getDrivers()).forEach(driver => {
        Homey.ManagerDrivers.getDriver(driver).getDevices().forEach(device => {
            Homey.app.log('getMeasurePower', device.getData().id, device.getMeasurePower());
            measurePower = device.getMeasurePower();
        })
    });
    return {
        "frames": [
            {
                "text": "" + measurePower,
                "icon": "a21256"
            }
        ]
    }
}

module.exports = [
    {
        description: 'Get measure power',
        method: 'GET',
        path: '/measurepower',
        public: true,
        role: 'owner',
        fn: function (args, callback) {
            callback(null, getMeasurePower())
        }
    }
];
