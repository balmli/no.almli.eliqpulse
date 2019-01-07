const env = require('../env');
const http = require('http.min');

function createRequest(func, params) {
    let bdyParams = params;
    bdyParams.first = true;
    bdyParams.tracking_time = 4;
    bdyParams.tracking_id = '6626ba76-1253-11e9-ab41-9a470f2ba59b';

    return new Promise((resolve, reject) => {
        http.post({
            uri: 'https://my.eliq.io/WebService.asmx/' + func + '?wsdl15468487464150.15349712158382145',
            json: true,
            headers: {
                "Cookie": env.getCookieString()
            }
        }, bdyParams)
            .then(function (data) {
                if (data.data && data.data.d && data.data.d.length > 1 && data.data.d[0] === 'OK') {
                    let result = JSON.parse(data.data.d[1]);
                    resolve(result);
                } else {
                    reject('Error');
                }
            })
            .catch(function (err) {
                reject(err);
            });
    });
}

async function getPulse() {
    return createRequest('LoadDashboard', {
        last: "2001-01-01",
        charts: ["wattmeter", "detailed_clock", "prognoses"],
        device_id: null
    });
}

async function getTrends() {
    return createRequest('GetTrends', {});
}

async function getEnergyDay(year, month, day) {
    return createRequest('GetEnergiDay', {
        channelid: 33100,
        year: year,
        month: month,
        day: day
    });
}

async function getEnergyMonth(year, month) {
    return createRequest('GetEnergiMonth', {
        channelid: 33100,
        year: year,
        month: month
    });
}

async function getEnergyYear(year) {
    return createRequest('GetEnergiYear', {
        channelid: 33100,
        year: year
    });
}

module.exports = {
    getPulse: getPulse,
    getTrends: getTrends,
    getEnergyDay: getEnergyDay,
    getEnergyMonth: getEnergyMonth,
    getEnergyYear: getEnergyYear
};

