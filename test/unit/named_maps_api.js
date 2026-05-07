'use strict';

const fs = require('fs');
const assert = require('assert');

const config = require('../../config.js');
const api = require('../../api.js');
const helpers = require('../../helpers.js');
const params = require('../params.js');

describe('Named Maps API test...', () => {
  before(() => {
    if (helpers.fileExists(params.options.tilesfileMapsAPI)) {
      fs.unlinkSync(params.options.tilesfileMapsAPI);
    }
  });

  it('downloads tiles into mbtiles file', async () => {
    const { layergroupId, metadata } = await api.instantiate(
      params.options.username,
      params.options.template,
    );

    const tileUrl = config.tile_url
      .replace('{username}', params.options.username)
      .replace('{layergroupid}', layergroupId);

    await api.downloadMbtiles({
      tileUrl,
      mbtilesFile: params.options.tilesfileMapsAPI,
      minzoom: params.options.minzoom,
      maxzoom: params.options.maxzoom,
      bounds: params.options.bounds,
      metadata,
      logProgress: params.options.logOutput,
    });

    assert.notEqual(helpers.fileExists(params.options.tilesfileMapsAPI), 0);
  });

  after(() => {
    if (helpers.fileExists(params.options.tilesfileMapsAPI)) {
      fs.unlinkSync(params.options.tilesfileMapsAPI);
    }
  });
});
