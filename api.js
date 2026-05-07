'use strict';

/**
 * CARTO API client.
 *
 * Public surface (all promise-based):
 *   - instantiatePublic(username, template)   -> { layergroupId, metadata }
 *   - instantiatePrivate(username, template)  -> { layergroupId, metadata }
 *   - instantiate(username, template)         -> picks public/private based on config.private
 *   - downloadMbtiles({ tileUrl, mbtilesFile, minzoom, maxzoom, bounds, metadata, logProgress })
 *   - streamGeoJson(url) -> a `request` HTTP stream that the caller pipes into a file
 *   - runTippecanoe({ mbtilesFile, geoJsonFile, minzoom, maxzoom })
 */

const tilelive = require('@mapbox/tilelive');
const MBTiles = require('@mapbox/mbtiles');
require('tilelive-http')(tilelive);
require('@mapbox/mbtiles').registerProtocols(tilelive);

const request = require('request');
const childProcess = require('child_process');

const config = require('./config.js');
const helpers = require('./helpers.js');

function instantiatePublic(username, template) {
  return new Promise((resolve, reject) => {
    const url = config.inst_url
      .replace('{username}', username)
      .replace('{template}', template);

    request.post(
      { url, headers: { 'Content-Type': 'application/json' } },
      (err, _req, body) => {
        if (err) return reject(err);
        let inst;
        try { inst = JSON.parse(body); }
        catch (e) { return reject(e); }
        if (!inst.layergroupid) {
          return reject(new Error(
            'Instantiate response is empty. (Possibly wrong username or template)'));
        }
        console.log('%s USER:%s, TEMPLATE:%s, LAYERGROUPID:%s, Instantiate was successful.',
          helpers.currdatetime(), username, template, inst.layergroupid);
        resolve({ layergroupId: inst.layergroupid, metadata: inst.metadata });
      },
    );
  });
}

// Two-step flow: GET the template, then POST its layergroup to obtain a layergroupid.
// Required when an MTP_API_KEY is in play (private datasets/maps).
function instantiatePrivate(username, template) {
  return new Promise((resolve, reject) => {
    const templateUrl = config.inst_url
      .replace('{username}', username)
      .replace('{template}', template);

    request.get({ url: templateUrl }, (err, _req, body) => {
      if (err) return reject(err);
      let parsed;
      try { parsed = JSON.parse(body); }
      catch (e) { return reject(e); }

      if (!parsed.template) {
        return reject(new Error(
          'Map template response is empty. (Possibly wrong username, template or api_key)'));
      }

      const mapUrl = config.map_url.replace('{username}', username);
      request.post(
        {
          url: mapUrl,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed.template.layergroup),
        },
        (postErr, _req2, body2) => {
          if (postErr) return reject(postErr);
          let inst;
          try { inst = JSON.parse(body2); }
          catch (e) { return reject(e); }
          if (!inst.layergroupid) {
            return reject(new Error(
              'Layergroup response is empty. (Possibly wrong username, template or api_key)'));
          }
          console.log('%s USER:%s, TEMPLATE:%s, LAYERGROUPID:%s, Get map template was successful.',
            helpers.currdatetime(), username, template, inst.layergroupid);
          resolve({ layergroupId: inst.layergroupid, metadata: inst.metadata });
        },
      );
    });
  });
}

function instantiate(username, template) {
  return config.private
    ? instantiatePrivate(username, template)
    : instantiatePublic(username, template);
}

/**
 * Copy tiles from `tileUrl` into an mbtiles file on disk via tilelive's
 * scanline copy, then stamp the file with vector_layers metadata so mobile
 * SDKs can decode it.
 */
function downloadMbtiles({ tileUrl, mbtilesFile, minzoom, maxzoom, bounds, metadata, logProgress }) {
  return new Promise((resolve, reject) => {
    const options = {
      type: 'scanline',
      minzoom: parseInt(minzoom, 10),
      maxzoom: parseInt(maxzoom, 10),
      bounds: bounds.toString().split(',').map(parseFloat),
      close: true,
      progress: logProgress ? helpers.report : false,
      concurrency: config.concurrency,
    };

    tilelive.copy(tileUrl, `mbtiles://${mbtilesFile}`, options, (copyErr) => {
      if (copyErr) return reject(copyErr);

      new MBTiles(`${mbtilesFile}?mode=rw`, (openErr, mbtiles) => {
        if (openErr) return reject(openErr);

        mbtiles.startWriting((startErr) => {
          if (startErr) return reject(startErr);

          const info = {
            minzoom: options.minzoom,
            maxzoom: options.maxzoom,
            bounds: options.bounds,
            format: 'pbf',
            name: 'mobile-tile-packager',
            json: JSON.stringify({
              vector_layers: metadata.layers.map((l) => ({ id: l.id, fields: {} })),
            }),
          };

          mbtiles.putInfo(info, (infoErr) => {
            if (infoErr) return reject(infoErr);
            mbtiles.stopWriting((stopErr) => stopErr ? reject(stopErr) : resolve());
          });
        });
      });
    });
  });
}

/**
 * Returns the raw `request` stream so callers can `.pipe(...)` it into a
 * file. Kept as a stream because GeoJSON payloads can be large.
 */
function streamGeoJson(url) {
  return request.get({ url, headers: { 'Content-Type': 'application/json' } });
}

/**
 * Shell out to tippecanoe to convert a GeoJSON file into an mbtiles file.
 * Resolves with the process exit code (0 on success).
 */
function runTippecanoe({ mbtilesFile, geoJsonFile, minzoom, maxzoom }) {
  return new Promise((resolve, reject) => {
    const cmd = config.tippe
      .replace('{mbtiles_file}', mbtilesFile)
      .replace('{geojson_file}', geoJsonFile)
      .replace('{minzoom}', minzoom)
      .replace('{maxzoom}', maxzoom);

    console.log('Process started - %s', cmd);

    const proc = childProcess.exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.log(error.stack);
        console.log('Error code: ' + error.code);
        console.log('Signal received: ' + error.signal);
        return reject(error);
      }
      if (stderr) console.log(stderr);
      if (stdout) console.log(stdout);
    });

    proc.on('exit', (code) => resolve(code));
  });
}

module.exports = {
  instantiatePublic,
  instantiatePrivate,
  instantiate,
  downloadMbtiles,
  streamGeoJson,
  runTippecanoe,
};
