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
                let measure_power_total = result.WattmeterInit.current;
                this.log('measure_power_total', measure_power_total);
                this.setCapabilityValue("measure_power", measure_power_total).catch(console.error);
                let measure_power_other = measure_power_total - measured_power.heating - measured_power.water;
                measure_power_other = measure_power_other < 0 ? 0 : measure_power_other;
                this.log('measure_power_other', measure_power_other);
                this.setCapabilityValue("measure_power_other", measure_power_other).catch(console.error);
                const now = new Date();
                if (this._lastMeterCheck !== undefined) {
                    let lastCheck = this._lastMeterCheck;
                    if (now.getDate() !== lastCheck.getDate()) {
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

    async getApi() {
        if (!this._api) {
            this._api = await HomeyAPI.forCurrentHomey();
        }
        return this._api;
    }

    async getDevices() {
        try {
            const api = await this.getApi();
            return await api.devices.getDevices();
        } catch (error) {
            console.error(error);
        }
    }

    async calcMeasuredPower() {
        let measure_power_heating = 0;
        let measure_power_light = 0;
        let measure_power_water = 0;
        let measure_power_other = 0;
        let devices = await this.getDevices();
        if (devices) {
            for (let device in devices) {
                let d = devices[device];
                if (d.capabilitiesObj && d.capabilitiesObj.measure_power && d.driverUri !== 'homey:app:no.almli.eliqpulse') {
                    let power = Math.round(100 * d.capabilitiesObj.measure_power.value) / 100;
                    if (d.virtualClass === 'heater' && d.class === 'socket' || d.class === 'thermostat') {
                        measure_power_heating += power;
                    } else if (d.virtualClass === 'light' && d.class === 'socket') {
                        measure_power_light += power;
                    } else if (d.name === 'Varmtvann' && d.class === 'socket') {
                        measure_power_water += power;
                    } else {
                        measure_power_other += power;
                    }
                    //console.log(d.name, d.virtualClass, d.class, d.capabilitiesObj.measure_power.value);
                }
            }
        }
        this.setCapabilityValue("measure_power_heating", measure_power_heating).catch(console.error);
        this.setCapabilityValue("measure_power_water", measure_power_water).catch(console.error);
        return {
            heating: measure_power_heating,
            light: measure_power_light,
            water: measure_power_water,
            other: measure_power_other
        };
    }

}

module.exports = EliqPulseDevice;
