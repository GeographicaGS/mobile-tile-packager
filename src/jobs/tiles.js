'use strict';

const fs = require('fs');
const { promisify } = require('util');

const config = require('../../config.js');
const api = require('../../api.js');
const errors = require('../errors.js');
const archive = require('../archive.js');

const writeFile = promisify(fs.writeFile);

/**
 * "Tiles" job pipeline (Maps API method):
 *   1. instantiate the named map     -> layergroupId + metadata
 *   2. download tiles into mbtiles   -> via tilelive scanline copy
 *   3. write the layers metadata     -> <base>.layers.json
 *   4. zip mbtiles + layers          -> <base>.zip
 *   5. delete the intermediate files
 *
 * On any step failure, throws a job-tagged Error so kue records meaningful
 * info (see src/errors.js).
 */
async function runTilesJob({ jobId, username, template, minzoom, maxzoom, bounds }) {
  const base = `${config.output}/${username}_${jobId}`;
  const mbtilesFile = `${base}.mbtiles`;
  const layersFile = `${base}.layers.json`;
  const zipFile = `${base}.zip`;

  try {
    const { layergroupId, metadata } = await api.instantiate(username, template);

    const tileUrl = config.tile_url
      .replace('{username}', username)
      .replace('{layergroupid}', layergroupId);

    await api.downloadMbtiles({
      tileUrl, mbtilesFile, minzoom, maxzoom, bounds, metadata,
      logProgress: config.report_log,
    });

    await writeFile(layersFile, JSON.stringify(metadata));
    await archive.zipFiles(zipFile, [mbtilesFile, layersFile], { username });
    await archive.deleteFiles([mbtilesFile, layersFile]);
  } catch (err) {
    throw errors.jobError({ jobId, username, template, message: err });
  }
}

module.exports = { runTilesJob };
