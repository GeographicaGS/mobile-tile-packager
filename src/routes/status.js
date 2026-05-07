'use strict';

const fs = require('fs');
const express = require('express');
const kue = require('kue');

const config = require('../../config.js');
const helpers = require('../../helpers.js');

const router = express.Router();

function notFound(res, refs, message) {
  const text = String(message && message.message ? message.message : message);
  console.error('%s USER:%s, JOB:%s, ERROR:%s',
    helpers.currdatetime(), refs.username, refs.job, text);
  res.status(404).setHeader('Content-Type', 'application/json');
  res.json({ params: [refs], errors: [{ message: text }] });
}

// Job status / metadata.
router.get('/api/v1/package_exports/:username/:job/', (req, res) => {
  const refs = { username: req.params.username, job: req.params.job };

  kue.Job.get(req.params.job, (err, job) => {
    if (err) return notFound(res, refs, err);
    if (job.data.username !== req.params.username) return notFound(res, refs, 'Not accessible');

    const out = {
      id: job.id,
      username: job.data.username,
      template: job.data.template,
      minzoom: job.data.minzoom,
      maxzoom: job.data.maxzoom,
      bounds: job.data.bounds,
      state: job._state,
      created_at: new Date(parseInt(job.created_at, 10)),
      updated_at: new Date(parseInt(job.updated_at, 10)),
      started_at: new Date(parseInt(job.started_at, 10)),
    };

    if (job._state === 'complete') {
      out.download_url = config.download_url
        .replace('{username}', job.data.username)
        .replace('{id}', job.id);
      out.duration = helpers.msToTime(job.duration);
    }

    if (job._state === 'failed') {
      out.error = job._error;
      out.failed_at = new Date(parseInt(job.failed_at, 10));
    }

    res.status(200).setHeader('Content-Type', 'application/json');
    res.json(out);
  });
});

// Download the produced .zip for a complete job.
router.get('/api/v1/package/get/:username/:job/', (req, res) => {
  const refs = { username: req.params.username, job: req.params.job };

  kue.Job.get(req.params.job, (err, job) => {
    if (err) return notFound(res, refs, err);
    if (job.data.username !== req.params.username) return notFound(res, refs, 'Not accessible');
    if (job._state !== 'complete') {
      return notFound(res, refs, 'Couldnt get package, job status: ' + job._state);
    }

    const filename = `${config.output}/${refs.username}_${refs.job}.zip`;
    if (!fs.existsSync(filename)) {
      return notFound(res, refs, 'No file - ' + filename);
    }

    console.log('downloaded - ' + filename);
    res.download(filename);
  });
});

module.exports = router;
