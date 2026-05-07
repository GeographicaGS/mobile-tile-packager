'use strict';

const fs = require('fs');
const { promisify } = require('util');

const config = require('../../config.js');
const api = require('../../api.js');
const errors = require('../errors.js');
const archive = require('../archive.js');

const writeFile = promisify(fs.writeFile);

function downloadGeoJsonToFile({ username, sql, minzoom, maxzoom }, destFile) {
  return new Promise((resolve, reject) => {
    const url = config.sql_api_url
      .replace('{username}', username)
      .replace('{sql}', sql)
      .replace('{minzoom}', minzoom)
      .replace('{maxzoom}', maxzoom);

    const req = api.streamGeoJson(url).pipe(fs.createWriteStream(destFile));
    req.on('error', reject);
    req.on('close', resolve);
  });
}

/**
 * "GeoJSON" job pipeline (SQL API method):
 *   1. instantiate the named map         -> metadata for the layers file
 *   2. download GeoJSON via SQL API      -> <base>.geojson
 *   3. convert GeoJSON to mbtiles        -> via tippecanoe
 *   4. write the layers metadata         -> <base>.layers.json
 *   5. zip mbtiles + layers              -> <base>.zip
 *   6. delete the intermediate files
 */
async function runGeoJsonJob({ jobId, username, template, sql, minzoom, maxzoom }) {
  const base = `${config.output}/${username}_${jobId}`;
  const geoJsonFile = `${base}.geojson`;
  const mbtilesFile = `${base}.mbtiles`;
  const layersFile = `${base}.layers.json`;
  const zipFile = `${base}.zip`;

  try {
    const { metadata } = await api.instantiate(username, template);

    await downloadGeoJsonToFile({ username, sql, minzoom, maxzoom }, geoJsonFile);
    await api.runTippecanoe({ mbtilesFile, geoJsonFile, minzoom, maxzoom });
    await writeFile(layersFile, JSON.stringify(metadata));
    await archive.zipFiles(zipFile, [mbtilesFile, layersFile], { username });
    await archive.deleteFiles([mbtilesFile, layersFile, geoJsonFile]);
  } catch (err) {
    throw errors.jobError({ jobId, username, sql, message: err });
  }
}

module.exports = { runGeoJsonJob };
