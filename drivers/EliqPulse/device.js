'use strict';

const Homey = require('homey'),
    pulse = require('../../lib/pulse');

class EliqPulseDevice extends Homey.Device {

    onInit() {
        this.log('Device has been initialized', this.getName());

        this._meterToday = 0;
        this._lastMeterCheck = undefined;

        this._requestFailedTrigger = new Homey.FlowCardTriggerDevice('request_failed');
        this._requestFailedTrigger
            .register();

        this.scheduleMeasurePower(5);
    }

    scheduleMeasurePower(seconds) {
        setTimeout(this.fetchMeasurePower.bind(this), seconds * 1000);
    }

    getMeasurePower() {
        return this.getCapabilityValue("measure_power");
    }

    async fetchMeasurePower() {
        pulse.getPulse()
            .then(result => {
                this.scheduleMeasurePower(10);
                let measure_power_total = result.WattmeterInit.current;
                this.log('measure_power_total', measure_power_total);
                this.setCapabilityValue("measure_power", measure_power_total).catch(console.error);

                const now = new Date();
                if (this._lastMeterCheck !== undefined) {
                    let lastCheck = this._lastMeterCheck;
                    if (now.getDate() !== lastCheck.getDate()) {
                        this.setCapabilityValue("meter_power_yesterday", this._meterToday).catch(console.error);
                        this._meterToday = 0;
                        lastCheck = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                    }
                    let diff_ms = now.getTime() - lastCheck.getTime();
                    this._meterToday += (measure_power_total / 1000) * (diff_ms / 3600000);
                }
                this._lastMeterCheck = now;
                const meterToday = Math.round(100 * this._meterToday) / 100;
                this.log('meterToday', meterToday);
                this.setCapabilityValue("meter_power", meterToday).catch(console.error);
            })
            .catch(err => {
                this.scheduleMeasurePower(60);
                console.error(err);
                this._requestFailedTrigger.trigger(this);
            });
    }

}

module.exports = EliqPulseDevice;
