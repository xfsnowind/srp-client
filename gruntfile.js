/*global module, require, process */

module.exports = function(grunt) {
    "use strict";

    // Load libs
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-connect-proxy');
    grunt.loadNpmTasks('grunt-contrib-connect');

    // Setup
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        watch: {
            options: {
                livereload: true
            },
            script: {
                files: ['src/**/*.js'],
                tasks: ['default'],
                options: {
                    atBegin: true
                }
            }
        },

        connect: {
            server: {
                options: {
                    port: 9000,
                    base: '.',
                    middleware: function (connect, options) {
                        var config = [
                            // Serve static files.
                            connect.static(options.base),
                            // Make empty directories browsable.
                            connect.directory(options.base)
                        ];
                        var proxy = require('grunt-connect-proxy/lib/utils').proxyRequest;
                        config.unshift(proxy);
                        return config;
                    }
                }
            },
            proxies: [
                //Proxy urls starting with /touch to nesstar-dev to prevent
                //same-origin problems when talking to rest server.
                {
                    context: '/',
                    host: 'localhost',
                    port: 8080,
                    https: false,
                    changeOrigin: false,
                    xforward: false
                }
            ]
        }
    });


    // Tasks
    grunt.registerTask('default', [
        'configureProxies',
        'connect:server',
        'watch'
    ]);
};
