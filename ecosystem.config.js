module.exports = {
  apps: [
    {
      name: "wabot-engine",
      script: "engine/index.mjs",
      interpreter: "node",
      interpreter_args: "--env-file=.env.local",
      cwd: "/home/maknoon/Desktop/bot-platform",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      error_file: "./engine-error.log",
      out_file: "./engine-out.log",
      log_file: "./engine-combined.log",
      time: true,
      max_restarts: 50,
      min_uptime: "10s",
      restart_delay: 5000,
      kill_timeout: 10000,
      wait_ready: false,
      listen_timeout: 30000,
      autorestart: true,
      vizion: false,
    },
  ],
};