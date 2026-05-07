'use strict';

const express = require('express');
const bodyParser = require('body-parser');

const config = require('../config.js');
const { registerProcessors } = require('./queue.js');
const exportsRoutes = require('./routes/exports.js');
const statusRoutes = require('./routes/status.js');

const app = express();
app.use(bodyParser.json());
app.use(exportsRoutes);
app.use(statusRoutes);

// Register kue processors once, before we start accepting traffic.
registerProcessors();

app.listen(config.server_port, () => {
  console.log('Listening server at port ' + config.server_port);
});

module.exports = app;
