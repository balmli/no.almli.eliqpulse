'use strict';

function getCookieString() {
    let cookieFile = '<-- cookies here -->';

    return cookieFile
        .split('\n')
        .filter(value => !value.startsWith('#'))
        .map(function (value) {
            let line = value.split('\t');
            return line[line.length - 2] + '=' + line[line.length - 1];
        })
        .join('; ');
}

module.exports = {
    getCookieString: getCookieString
};
