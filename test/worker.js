const assert = require('assert');
const Worker = require('../lib/client/worker');
let worker;

const ROUTE = 'test/run';

describe('Worker', () => {
  describe('#constructor', () => {

    // @TODO: add test to ensure `route` matches specifications

    it('should return an error if no action is provided', async function () {
      assert.throws(() => {
        new Worker(Route);
      });
    });

    it('should return an error if the action provided is not a function', async function () {
      assert.throws(() => {
        new Worker(Route, {});
      });
    });
  });

  describe('#init', () => {

  });
});
