'use strict';

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const archiver = require('archiver');

const helpers = require('../helpers.js');

const unlink = promisify(fs.unlink);

/**
 * Build a .zip at `zipPath` containing the given source files (each placed
 * at the archive root under its basename). Resolves once the archive has
 * been fully written to disk.
 */
function zipFiles(zipPath, files, { username }) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip');
    const out = fs.createWriteStream(zipPath);

    archive.on('error', reject);
    archive.on('end', () => {
      console.log('%s USER:%s, Archive wrote %d bytes.',
        helpers.currdatetime(), username, archive.pointer());
      resolve();
    });

    archive.pipe(out);
    for (const file of files) {
      archive.file(file, { name: path.basename(file) });
    }
    archive.finalize();
  });
}

/**
 * Best-effort delete: missing files are ignored so cleanup never masks the
 * real error from the surrounding job.
 */
async function deleteFiles(files) {
  for (const file of files) {
    try { await unlink(file); }
    catch (err) { /* ignore */ }
  }
}

module.exports = { zipFiles, deleteFiles };
