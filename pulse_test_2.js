'use strict';

const pulse = require('./lib/pulse');
const env = require('./env');

let today = new Date();

pulse.getTrends()
    .then(result => {
        console.log(result);
        console.log(Math.round(1000 * result.trend.sofar_day) / 1000);
    }).catch(console.error);
