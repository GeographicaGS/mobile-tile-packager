'use strict';

const helpers = require('../helpers.js');

// Make Error instances JSON-serialisable so kue stores meaningful failure info.
if (!('toJSON' in Error.prototype)) {
  Object.defineProperty(Error.prototype, 'toJSON', {
    value: function () {
      const alt = {};
      Object.getOwnPropertyNames(this).forEach((key) => { alt[key] = this[key]; });
      return alt;
    },
    configurable: true,
    writable: true,
  });
}

/**
 * Build an Error decorated with the job context (time, user, template/sql)
 * and log it to stderr in the project's standard format.
 */
function jobError({ jobId, username, template, sql, message }) {
  const text = message && message.message ? message.message : String(message);
  const error = new Error(text);
  error.time = helpers.currdatetime();
  error.user = username;
  if (template) error.template = template;
  if (sql) error.sql = sql;

  const detail = template ? `TEMPLATE:${template}` : `SQL:${sql}`;
  console.error('%s JOB:%s, USER:%s, %s, ERROR:%s',
    error.time, jobId, username, detail, text);
  return error;
}

module.exports = { jobError };
