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
        let sum_devices_measure_power = await this.calcSumDevicesMeasurePower();

        pulse.getPulse()
            .then(result => {
                let total_measure_power = result.WattmeterInit.current;
                this.log('total_measure_power', total_measure_power);
                this.setCapabilityValue("measure_power", total_measure_power).catch(console.error);
                let other_measure_power = total_measure_power - sum_devices_measure_power > 0 ? total_measure_power - sum_devices_measure_power : 0;
                this.log('other_measure_power', other_measure_power);
                this.setCapabilityValue("other_measure_power", other_measure_power).catch(console.error);
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
                let meterPower = null;
                if (result.data_this_period) {
                    if (result.data_this_period.length > 1) {
                        meterPower = result.data_this_period[result.data_this_period.length - 2] / 1000;
                    } else if (result.data_this_period.length > 0) {
                        meterPower = result.data_this_period[result.data_this_period.length - 1] / 1000;
                    }
                }
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
        let currentHomey = await HomeyAPI.forCurrentHomey();
        let devices = await currentHomey.devices.getDevices();
        let sum_devices = 0;
        let heating_measure_power = 0;
        let water_measure_power = 0;
        for (let device in devices) {
            let d = devices[device];
            if (d.capabilitiesObj.measure_power && d.driverUri !== 'homey:app:no.almli.eliqpulse') {
                let power = Math.round(100 * d.capabilitiesObj.measure_power.value) / 100;
                sum_devices += power;
                if (d.virtualClass === 'heater' && d.class === 'socket' || d.class === 'thermostat') {
                    heating_measure_power += power;
                } else if (d.name === 'Varmtvann' && d.class === 'socket') {
                    water_measure_power += power;
                }
                console.log(d.name, d.virtualClass, d.class, d.capabilitiesObj.measure_power.value);
            }
        }
        this.log('heating_measure_power', heating_measure_power);
        this.setCapabilityValue("heating_measure_power", heating_measure_power).catch(console.error);
        this.log('water_measure_power', water_measure_power);
        this.setCapabilityValue("water_measure_power", water_measure_power).catch(console.error);
        this.log('sum_devices', sum_devices);
        return sum_devices;
    }

}

module.exports = EliqPulseDevice;
