/* eslint-disable @typescript-eslint/no-require-imports */
module.exports = {
  apps: [
    {
      name: "wabot-engine",
      script: "engine/index.mjs",
      cwd: __dirname,
      interpreter: "node",
      interpreter_args: "--env-file=.env.local --dns-result-order=ipv4first",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "450M",
      restart_delay: 4000,
      min_uptime: "10s",
      max_restarts: 50,
      kill_timeout: 10000,
      time: true,
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/pm2-engine-error.log",
      out_file: "./logs/pm2-engine-out.log",
      merge_logs: true,
    },
  ],
};