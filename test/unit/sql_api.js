'use strict';

const fs = require('fs');
const assert = require('assert');

const config = require('../../config.js');
const api = require('../../api.js');
const helpers = require('../../helpers.js');
const params = require('../params.js');

function removeIfExists(file) {
  if (helpers.fileExists(file)) fs.unlinkSync(file);
}

describe('SQL API test...', () => {
  before(() => {
    removeIfExists(params.options.geoJsonFile);
    removeIfExists(params.options.tilesfileSQLAPI);
  });

  it('downloads GeoJSON file', (done) => {
    const url = config.sql_api_url
      .replace('{username}', params.options.username)
      .replace('{sql}', params.options.sql)
      .replace('{minzoom}', params.options.minzoom)
      .replace('{maxzoom}', params.options.maxzoom);

    const req = api.streamGeoJson(url).pipe(fs.createWriteStream(params.options.geoJsonFile));
    req.on('error', done);
    req.on('close', done);
  });

  it('GeoJSON file exists and is greater than 0 bytes', () => {
    assert.notEqual(helpers.fileExists(params.options.geoJsonFile), 0);
  });

  it('builds mbtiles via tippecanoe', async () => {
    await api.runTippecanoe({
      mbtilesFile: params.options.tilesfileSQLAPI,
      geoJsonFile: params.options.geoJsonFile,
      minzoom: params.options.minzoom,
      maxzoom: params.options.maxzoom,
    });
  });

  after(() => {
    removeIfExists(params.options.geoJsonFile);
    removeIfExists(params.options.tilesfileSQLAPI);
  });
});
