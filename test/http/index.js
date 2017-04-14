const { describe, it } = require('mocha');

const { testServer, equal } = require('./util');

const twoOhFour = require('./204');
const render = require('./render');
const cookie = require('./cookie');

module.exports = arg => {
  describe('server', () => {
    const { server } = arg;
    it('handles params correctly', () => testServer(server, '/test/1').then(res => {
      equal([
        [res.statusCode, 200],
        [res._getString(), '1'],
      ]);
    }));
    it('sets custom headers', () => testServer(server, '/status/json').then(res => {
      equal([
        [res._headers['x-status'], 'ok'],
      ]);
    }));

    render(arg);
    twoOhFour(arg);
    cookie(arg);
  });
};
