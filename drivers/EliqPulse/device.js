'use strict';

const Homey = require('homey'),
    {HomeyAPI} = require('athom-api'),
    pulse = require('../../lib/pulse');

class EliqPulseDevice extends Homey.Device {

    onInit() {
        this.log('Device has been initialized', this.getName());
        this.scheduleMeasurePower(5);
        this.scheduleMeterPower(10);
    }

    scheduleMeasurePower(seconds) {
        setTimeout(this.fetchMeasurePower.bind(this), seconds * 1000);
    }

    async fetchMeasurePower() {
        let sum_devices_measure_power = await calcSumDevicesMeasurePower();

        pulse.getPulse()
            .then(result => {
                let total_measure_power = result.WattmeterInit.current;
                this.log('total_measure_power', total_measure_power);
                this.setCapabilityValue("measure_power", total_measure_power).catch(console.error);
                let other_measure_power = total_measure_power - sum_devices_measure_power > 0 ? total_measure_power - sum_devices_measure_power : 0;
                this.log('other_measure_power', other_measure_power);
                this.scheduleMeasurePower(5);
            })
            .catch(err => {
                console.error(err);
                this.scheduleMeasurePower(60);
            });
    }

    scheduleMeterPower(seconds) {
        setTimeout(this.fetchMeterPower.bind(this), seconds * 1000);
    }

    async fetchMeterPower() {
        pulse.getTrends()
            .then(result => {
                let meterPower = Math.round(1000 * result.trend.sofar_day) / 1000;
                this.log('meter_power', meterPower);
                this.setCapabilityValue("meter_power", meterPower).catch(console.error);
                this.scheduleMeterPower(120);
            })
            .catch(err => {
                console.error(err);
                this.scheduleMeterPower(120);
            });
    }

    async calcSumDevicesMeasurePower() {
        return 0;
        /*
        let currentHomey = await HomeyAPI.forCurrentHomey();
        let devices = await currentHomey.devices.getDevices();
        let sum_devices_measure_power = 0;
        for (let device in devices) {
            let d = devices[device];
            if (d.capabilitiesObj.measure_power) {
                sum_devices_measure_power += d.capabilitiesObj.measure_power.value;
            }
        }
        this.log('sum_devices_measure_power', sum_devices_measure_power);
        return sum_devices_measure_power;
        */
    }

}

module.exports = EliqPulseDevice;
