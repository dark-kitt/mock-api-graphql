/** file system */
const { existsSync } = require('fs');
const { spawn } = require('child_process');
/** require environment variables */
let env = (() => existsSync('.env') ? require('dotenv').config({ path: '.env' }) : {})();
/**
 * Returns Mock API server as child process
 * @param {boolean} initial process
 * @returns {object} process data
 * --------------------------------
 */
const server = initial => {
  /** merge environment variables */
  env = Object.assign(process.env, { INITIAL: initial });

  /** start child process for the Mock API */
  let child = spawn('node', ['mock-api.js'], { env });

  /** child info/logs */
  child.stdout.on('data', data => {
    try {
      /** check if data is object */
      const obj = JSON.parse(data.toString());
      /** handle object data */
      if ({}.hasOwnProperty.call(obj, 'restart')) {
        child.kill();
      }
    } catch (error) {
      console.log(data.toString());
    }
  });

  /** child errors */
  child.stderr.on('data', data => {
    console.error(
      '\x1b[1m\x1b[31m%s\x1b[0m\x1b[0m',
      `> Mock API server crashed on ... http://${env.MOCK_API_HOST}:${env.MOCK_API_PORT}\n`,
      data.toString()
    );
  });

  child.on('close', () => {
    /** Wait for process to exit, then run again */
    setTimeout(() => server(false), 500);
  });

  /** kill child process if parent process gets killed */
  process.on('exit', () => child.kill('SIGINT'));

  return child;
};

module.exports = (() => server(true))();
