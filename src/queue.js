'use strict';

const kue = require('kue');

const config = require('../config.js');
const { runTilesJob } = require('./jobs/tiles.js');
const { runGeoJsonJob } = require('./jobs/geojson.js');

const queue = kue.createQueue({
  prefix: config.kue_redis_prefix,
  redis: {
    port: config.kue_redis_port,
    host: config.kue_redis_host,
  },
});

let processorsRegistered = false;

/**
 * Register kue processors for the two job types. Idempotent: calling more
 * than once is a no-op, which protects against the previous bug where the
 * POST handlers re-registered processors on every request.
 */
function registerProcessors() {
  if (processorsRegistered) return;
  processorsRegistered = true;

  queue.process('tiles', (job, done) => {
    console.log('processing job: #%d', job.id);
    runTilesJob({ jobId: job.id, ...job.data }).then(() => done(), done);
  });

  queue.process('geojson', (job, done) => {
    console.log('processing job: #%d', job.id);
    runGeoJsonJob({ jobId: job.id, ...job.data }).then(() => done(), done);
  });
}

module.exports = { queue, registerProcessors };
