'use strict';

const express = require('express');
const { queue } = require('../queue.js');
const helpers = require('../../helpers.js');

const router = express.Router();

function badRequest(res, message) {
  console.error('%s ERROR:%s', helpers.currdatetime(), message);
  res.status(400).setHeader('Content-Type', 'application/json');
  res.json({ errors: [{ message }] });
}

function ensureJsonContentType(req, res) {
  const ct = req.headers['content-type'];
  if (!ct || ct.indexOf('application/json') !== 0) {
    badRequest(res, 'Content-type is not json');
    return false;
  }
  return true;
}

function isInvalidMaxzoom(maxzoom) {
  // Preserves original semantics: rejects falsy (incl. 0) and out-of-range.
  return !maxzoom || maxzoom < 0 || maxzoom > 22;
}

function enqueue(res, type, params) {
  console.log('creating job...');
  const job = queue.create(type, params).save((err) => {
    if (err) {
      console.error(err.message);
      return;
    }
    res.status(200).setHeader('Content-Type', 'application/json');
    res.json({ id: job.id, created_at: new Date(parseInt(job.created_at, 10)) });
  });
}

// Maps API export: download tiles for the given bounds + zoom range.
router.post('/api/v1/package_exports', (req, res) => {
  if (!ensureJsonContentType(req, res)) return;

  const data = req.body && req.body.data;
  if (!data) return badRequest(res, 'data missing');
  if (!data.username) return badRequest(res, 'data.username missing');
  if (!data.template) return badRequest(res, 'data.template missing');
  if (isInvalidMaxzoom(data.maxzoom)) return badRequest(res, 'data.maxzoom value must between 1 and 22');
  if (!data.bounds) return badRequest(res, 'data.bounds: "lon, lat, lon, lat"');

  enqueue(res, 'tiles', {
    username: data.username,
    template: data.template,
    minzoom: data.minzoom || 0,
    maxzoom: data.maxzoom,
    bounds: data.bounds,
  });
});

// SQL API export: run a SQL query, convert resulting GeoJSON to mbtiles.
router.post('/api/v1/package_exports_by_sql', (req, res) => {
  if (!ensureJsonContentType(req, res)) return;

  const data = req.body && req.body.data;
  if (!data) return badRequest(res, 'data missing');
  if (!data.username) return badRequest(res, 'data.username missing');
  if (!data.template) return badRequest(res, 'data.template missing');
  if (!data.sql) return badRequest(res, 'data.sql missing');
  if (isInvalidMaxzoom(data.maxzoom)) return badRequest(res, 'data.maxzoom value must between 1 and 22');

  enqueue(res, 'geojson', {
    username: data.username,
    template: data.template,
    sql: data.sql,
    minzoom: data.minzoom || 0,
    maxzoom: data.maxzoom,
  });
});

module.exports = router;
