'use strict';

const Homey = require('homey'),
    {HomeyAPI} = require('athom-api'),
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
        this.scheduleMeterPower(10);
    }

    scheduleMeasurePower(seconds) {
        setTimeout(this.fetchMeasurePower.bind(this), seconds * 1000);
    }

    async fetchMeasurePower() {
        let measured_power = await this.calcMeasuredPower();
        this.log('measured_power', measured_power);

        pulse.getPulse()
            .then(result => {
                this.scheduleMeasurePower(10);
                let total_measure_power = result.WattmeterInit.current;
                this.log('total_measure_power', total_measure_power);
                this.setCapabilityValue("measure_power", total_measure_power).catch(console.error);
                let other_measure_power = total_measure_power - measured_power.heating - measured_power.water;
                other_measure_power = other_measure_power < 0 ? 0 : other_measure_power;
                this.log('other_measure_power', other_measure_power);
                this.setCapabilityValue("other_measure_power", other_measure_power).catch(console.error);
                const now = new Date();
                if (this._lastMeterCheck !== undefined) {
                    let lastCheck = this._lastMeterCheck;
                    if (now.getDate() !== lastCheck.getDate()) {
                        this._meterToday = 0;
                        lastCheck = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                    }
                    let diff_ms = now.getTime() - lastCheck.getTime();
                    this._meterToday += (total_measure_power / 1000) * (diff_ms / 3600000);
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

    scheduleMeterPower(seconds) {
        setTimeout(this.fetchMeterPower.bind(this), seconds * 1000);
    }

    async fetchMeterPower() {
        pulse.getTrends()
            .then(result => {
                this.scheduleMeterPower(120);
                let meterPower = null;
                if (result.data_this_period) {
                    if (result.data_this_period.length > 1) {
                        meterPower = result.data_this_period[result.data_this_period.length - 2] / 1000;
                    } else if (result.data_this_period.length > 0) {
                        meterPower = result.data_this_period[result.data_this_period.length - 1] / 1000;
                    }
                }
                this.log('meter_power_yesterday', meterPower);
                this.setCapabilityValue("meter_power_yesterday", meterPower).catch(console.error);
            })
            .catch(err => {
                this.scheduleMeterPower(120);
                console.error(err);
                this._requestFailedTrigger.trigger(this);
            });
    }

    async calcMeasuredPower() {
        let currentHomey = await HomeyAPI.forCurrentHomey();
        let devices = await currentHomey.devices.getDevices();
        let heating_measure_power = 0;
        let light_measure_power = 0;
        let water_measure_power = 0;
        let other_measure_power = 0;
        for (let device in devices) {
            let d = devices[device];
            if (d.capabilitiesObj && d.capabilitiesObj.measure_power && d.driverUri !== 'homey:app:no.almli.eliqpulse') {
                let power = Math.round(100 * d.capabilitiesObj.measure_power.value) / 100;
                if (d.virtualClass === 'heater' && d.class === 'socket' || d.class === 'thermostat') {
                    heating_measure_power += power;
                } else if (d.virtualClass === 'light' && d.class === 'socket') {
                    light_measure_power += power;
                } else if (d.name === 'Varmtvann' && d.class === 'socket') {
                    water_measure_power += power;
                } else {
                    other_measure_power += power;
                }
                //console.log(d.name, d.virtualClass, d.class, d.capabilitiesObj.measure_power.value);
            }
        }
        this.setCapabilityValue("heating_measure_power", heating_measure_power).catch(console.error);
        this.setCapabilityValue("water_measure_power", water_measure_power).catch(console.error);
        return {
            heating: heating_measure_power,
            light: light_measure_power,
            water: water_measure_power,
            other: other_measure_power
        };
    }

}

module.exports = EliqPulseDevice;
