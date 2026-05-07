'use strict';

const fs = require('fs');
const util = require('util');

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch (err) {
    return false;
  }
}

function currdatetime() {
  return new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
}

function pad(str, len, padLeft) {
  while (str.length < len) str = padLeft ? ' ' + str : str + ' ';
  return str;
}

function formatNumber(num) {
  num = num || 0;
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'm';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'k';
  return num.toFixed(0);
}

function formatDuration(duration) {
  const seconds = duration % 60;
  duration -= seconds;
  const minutes = (duration % 3600) / 60;
  duration -= minutes * 60;
  const hours = (duration % 86400) / 3600;
  duration -= hours * 3600;
  const days = duration / 86400;
  return (days > 0 ? days + 'd ' : '') +
    (hours > 0 || days > 0 ? hours + 'h ' : '') +
    (minutes > 0 || hours > 0 || days > 0 ? minutes + 'm ' : '') +
    seconds + 's';
}

// tilelive progress callback: prints one status line per tick.
function report(stats, p) {
  console.log(util.format('\r\x1b[K[%s] %s%% speed %s/s | done %s skipped %s | %s left',
    pad(formatDuration(process.uptime()), 4, true),
    pad((p.percentage).toFixed(4), 8, true),
    pad(formatNumber(p.speed), 4, true),
    formatNumber(stats.done - stats.skipped),
    formatNumber(stats.skipped),
    formatDuration(p.eta)));
}

function msToTime(duration) {
  const ms = parseInt((duration % 1000) / 100, 10);
  const seconds = parseInt((duration / 1000) % 60, 10);
  const minutes = parseInt((duration / (1000 * 60)) % 60, 10);
  const hours = parseInt((duration / (1000 * 60 * 60)) % 24, 10);
  const pp = (n) => (n < 10 ? '0' + n : '' + n);
  return `${pp(hours)}:${pp(minutes)}:${pp(seconds)}.${ms}`;
}

module.exports = { fileExists, currdatetime, report, msToTime };
