/** file system */
const fs = require('fs');
const md5 = require('md5');
const path = require('path');
const { readFileSync } = require('fs');
/** server data */
const http = require('http');
const expressModule = require('express');
const express = expressModule();
const server = http.createServer(express);
/** graphql */
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
/** define globals */
const data = './data';
const ignore = ['.DS_Store', 'Thumbs.db'];
const env = process.env;
const host = env.MOCK_API_HOST || '127.0.0.1';
const port = env.MOCK_API_PORT || 3000;
const namespace = env.MOCK_API_NAMESPACE || '';
/**
 * get routes data from ./data directory
 *
 * NOTE:
 * each graphql schema must
 * match a JS data file in
 * the same directory
 *
 * @param {string} directory
 * @returns {Array} routes
 */
const getRoutes = dir => {
  const root = path.resolve(__dirname, dir);
  const routes = [];

  const data = path =>
    fs.readdirSync(path, { withFileTypes: true }).forEach(file => {
      if (ignore.includes(file.name) || file.name.endsWith('.graphql')) return false;

      if (file.isDirectory()) return data(`${path}/${file.name}`);

      const name = file.name.replace(/\.js/, '');
      const route = path === root ? '' : path.replace(root, '');
      const endpoint = name.replace(/\s+/g, '-');

      routes.push({
        name: name,
        data: file.name,
        directory: route,
        graphql: `${name}.graphql`,
        route: `${route}/${endpoint}`
      });
    });
  data(root);

  return routes;
};
/**
 * register all routes
 *
 * NOTE:
 * each graphql schema must
 * match a JS data file in
 * the same directory
 *
 * @param {Array} routes
 */
const registerRoutes = routes => {
  routes.forEach(async route => {
    const graphql = path.resolve(__dirname, `./data${route.directory}/${route.graphql}`);
    await fs.stat(graphql, (error, stats) => {
      error, stats;
    });

    const data = path.resolve(__dirname, `./data${route.directory}/${route.data}`);
    await fs.stat(data, (error, stats) => {
      error, stats;
    });

    const typeDefs = await buildSchema(readFileSync(graphql).toString('utf-8'));
    const rootValue = await require(data);

    express.use(
      namespace + route.route,
      graphqlHTTP({
        schema: typeDefs,
        rootValue: rootValue,
        graphiql: true
      })
    );
  });
};
/**
 * start watching data files
 *
 * stop current process if files
 * were edited and restart the server
 *
 * @param {String} directory
 */
const watch = directory => {
  let md5Previous = null;
  let fsWait = false;

  fs.watch(path.resolve(__dirname, directory), { recursive: true }, (event, filename) => {
    if ((event === 'change' || event === 'rename') && filename) {
      /** if people exec multiple times save */
      if (fsWait) return false;

      const md5Current = md5(fs.readFileSync(path.resolve(__dirname, `${directory}/${filename}`)));
      /** compare file hashes */
      if (md5Current === md5Previous) return false;

      /** restart server */
      fsWait = true;
      setTimeout(async () => {
        fsWait = false;
        md5Previous = md5Current;

        console.info(
          '\x1b[33m%s\x1b[0m',
          `- ${filename} changed\n> Mock API server restarts on ... http://${host}:${port}`
        );

        /** restart child process */
        console.log(JSON.stringify({ restart: true }));
      }, 2000);
    }
  });
};
/**
 * initialize server
 */
const init = () => {
  registerRoutes(getRoutes(data));

  server
    .listen(port, host, () => {
      const open = env.INITIAL === 'true' ? 'open' : 'reopened';

      console.info(
        '\x1b[1m\x1b[32m%s\x1b[0m\x1b[0m',
        `> Mock API server ${open} on ... http://${server.address().address}:${
          server.address().port
        }`
      );

      /** start watching data files */
      watch(data);
    })
    .on('error', error => {
      if (error) console.log('[ERROR] Mock API: ', error);
    });
};

init();
