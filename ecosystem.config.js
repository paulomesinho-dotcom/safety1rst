module.exports = {
    apps: [
        {
            name: 'safesite',
            script: 'node_modules/.bin/next',
            args: 'start',
            cwd: '/var/www/safesite',
            instances: 1, // Aumentar para 'max' quando tiveres mais RAM
            exec_mode: 'fork',
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000,
            },
            // Restart automático
            max_restarts: 10,
            restart_delay: 3000,
            // Logs
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            out_file: '/var/log/safesite/out.log',
            error_file: '/var/log/safesite/error.log',
            merge_logs: true,
        },
    ],
};
