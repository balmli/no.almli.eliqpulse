'use strict';

const pulse = require('./lib/pulse');
const env = require('./env');

let today = new Date();

pulse.getEnergyDay(today.getFullYear(), today.getMonth() + 1, today.getDate())
    .then(result => {
        console.log(result);
    }).catch(console.error);
