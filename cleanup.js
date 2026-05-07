'use strict';

/**
 * One-shot maintenance script: removes old kue jobs in 'complete', 'failed'
 * or 'active' state, plus their .zip artifacts. Intended to be run from
 * cron; exits the process when finished.
 */

const fs = require('fs');
const { promisify } = require('util');
const kue = require('kue');

const config = require('./config.js');

const queue = kue.createQueue();
const unlink = promisify(fs.unlink);
const rangeByState = promisify(kue.Job.rangeByState);

// NOTE: original script defined separate thresholds for each state but only
// applied the "complete" one. Behaviour preserved here — single threshold
// for all three states. Adjust per-state if/when the policy changes.
const SWEEP_AGE_MS = 2 * 24 * 60 * 60 * 1000;
const MAX_JOBS = 100;

async function sweep(state) {
  const jobs = await rangeByState(state, 0, MAX_JOBS, 'asc');
  const now = Date.now();

  for (const job of jobs) {
    const validUntil = parseInt(job.created_at, 10) + SWEEP_AGE_MS;

    if (now <= validUntil) {
      console.log('valid %s %s < %s job - %s', state, now, validUntil, job.id);
      continue;
    }

    job.remove();

    if (state === 'complete') {
      const zipFile = `${config.output}/${job.data.username}_${job.id}.zip`;
      try {
        await unlink(zipFile);
        console.log('removed file %s', zipFile);
      } catch (err) {
        // missing file is fine — kue entry is gone, nothing to do
      }
    }

    console.log('removed %s job %s', state, job.id);
  }
}

(async () => {
  try {
    await Promise.all([sweep('complete'), sweep('failed'), sweep('active')]);
    console.log('Done..');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
