/*global module, require, process */

module.exports = function(grunt) {
    "use strict";

    // Load libs
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-connect-proxy');
    grunt.loadNpmTasks('grunt-contrib-copy');


    // Setup
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        watch: {
            options: {
                livereload: true
            },
            script: {
                files: ['src/**/*.js'],
                tasks: ['copy:lib'],
                options: {
                    atBegin: true
                }
            }
        },

        copy: {
            lib: {
                src: ['lib/*.js', 'src/**/*'],
                dest: 'deploy/'
            }
        },

        clean: {
            build: ['deploy/src', 'deploy/lib'],
        },

        connect: {
            server: {
                options: {
                    port: 9001,
                    base: 'deploy',
                    middleware: function (connect, options) {
                        var proxy = require('grunt-connect-proxy/lib/utils').proxyRequest;
                        return [
                           // Include the proxy first
                           proxy,
                           // Serve static files.
                           connect.static(options.base),
                           // Make empty directories browsable.
                           connect.directory(options.base)
                        ];
                    }
                }
            },
            proxies: [
                //Proxy urls starting with /touch to nesstar-dev to prevent
                //same-origin problems when talking to rest server.
                {
                    context: ['/auth', '/register'],
                    host: 'localhost',
                    port: 3000,
                    https: false,
                    changeOrigin: false,
                    xforward: false
                }
            ]
        }
    });


    // Tasks
    grunt.registerTask('server', [
        'copy',
        'configureProxies',
        'connect:server',
        'watch'
    ]);

    grunt.registerTask('clean', [
        'clean'
    ]);
};
