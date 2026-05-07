'use strict';

const assert = require('assert');
const api = require('../../api.js');
const params = require('../params.js');

describe('Instantiate test...', () => {
  it('should return layergroupid', async () => {
    const { layergroupId } = await api.instantiate(
      params.options.username,
      params.options.template,
    );
    assert(layergroupId);
  });
});
