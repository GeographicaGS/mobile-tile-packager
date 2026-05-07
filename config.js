'use strict';

const port = 8787;
const mtpHost = process.env.MTP_HOST || 'localhost';
const apiKey = process.env.MTP_API_KEY ? `api_key=${process.env.MTP_API_KEY}` : '';

module.exports = {
  // Per-tile progress logging (verbose). Off by default.
  report_log: false,

  // Number of parallel tile downloads.
  concurrency: 5,

  // Working directory for intermediate + final files.
  output: '/tmp',

  // HTTP server port.
  server_port: port,

  // Truthy when an API key is configured. Used to pick public vs private
  // instantiation flow in api.js.
  private: apiKey,

  // CARTO endpoints. Placeholders are filled in at call time.
  inst_url: `https://{username}.carto.com/api/v1/map/named/{template}?${apiKey}`,
  map_url: `https://{username}.carto.com/api/v1/map?${apiKey}`,
  tile_url: `https://{username}.carto.com/api/v1/map/{layergroupid}/{z}/{x}/{y}.mvt?${apiKey}`,
  sql_api_url: `http://{username}.carto.com/api/v2/sql?${apiKey}&q={sql}&format=GeoJSON`,

  // Download URL handed back to clients once a job is complete.
  download_url: `http://${mtpHost}:${port}/api/v1/package/get/{username}/{id}`,

  // tippecanoe command line. Placeholders are filled in at call time.
  tippe: 'tippecanoe -o {mbtiles_file} --minimum-zoom={minzoom} --maximum-zoom={maxzoom} --layer=layer {geojson_file}',

  // Kue / Redis settings.
  kue_redis_port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
  kue_redis_host: process.env.REDIS_HOST || '127.0.0.1',
  kue_redis_prefix: 'q',
};
