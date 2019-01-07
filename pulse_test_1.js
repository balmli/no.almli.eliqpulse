'use strict';

const pulse = require('./lib/pulse');

pulse.getPulse()
    .then(result => {
        console.log(result.WattmeterInit);
    }).catch(console.error);

