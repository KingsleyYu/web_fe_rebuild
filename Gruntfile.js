module.exports = function(grunt) {
    grunt.file.defaultEncoding = 'utf8';
    // Project configuration.
    var req = {
        options: {
            baseUrl: 'jssrc',
            optimize: "",
        }
    };


    grunt.file.expand({
        cwd: "jssrc"
    }, ["*/*.js", "!components/*.js"]).forEach(function(file) {
        var fileName = file.replace(/\.js$/, '');
        var newfileName = file.replace(/\.js$/, '.min.js');
        req[fileName] = {
            options: {
                name: fileName,
                out: 'js/' + newfileName,
            }
        };
    });

    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
     配置任务目标
     -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    grunt.initConfig({
        /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
        读取package.json信息
        -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
        // pkg: grunt.file.readJSON("package.json"),

        /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
        读取config.json信息
        -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
        //project: grunt.file.readJSON("project.json"),

        /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
        合并js和css
        @合并 jquery-1.11.3.js, jquery.scrollup.js ,jquery.lazyload.js， jquery.cookie.js以及当前应用的基类为app.js
        -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
        concat: {
            public: {
                src: ["jssrc/jquery-1.11.3.js", "jssrc/controller.js","jssrc/bootstrap.js"],
                dest: "jssrc/app.js"
            },
        },
        /*-------------------------------------------   ----------------------------------------------------------------------------------------------------------------------------
        压缩js
        -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
        uglify: {
            public: {
                src: "jssrc/app.js",
                dest: "js/app.min.js"
            },
            one: {
                options: {
                    compress: true
                },
                files: {

                }
            }
        },
        /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
        将less自动编译成css
        -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
        less: {
            build: {
                options: {
                    compress: true,
                    banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
                },
                files: {

                }
            },
            /*单个less文件的编译配置*/
            one: {
                options: {
                    compress: true
                },
                files: {

                }
            },

            public: {
                options: {
                    compress: true
                },
                files: {
                    "css/app.min.css": ['less/app.less']
                }
            }
        },

        /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
        watch 自动监控文件变化执行Task
        -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
        watch: {
            /*对于业务功能页面对应less文件改动的监控*/
            business_less: {
                files: ['less/*/*.less', '!less/components/*.less', '!less/mixins/*.less', '!less/variables/*.less'],
                tasks: ["less:one"],
                options: {
                    nospawn: true,
                    livereload: false
                }
            },
            /*对于app.less相关依赖less改动的监控*/
            app_less: {
                files: ['less/*.less', 'less/components/*.less', 'less/mixins/*.less', 'variables/*.less'],
                tasks: ["less:public"],
                options: {
                    nospawn: true,
                    livereload: false
                }
            },
            /*对于业务功能页面对应javascript文件改动的监控*/
            business_js: {
                files: ['jssrc/*/*.js','jssrc/components/*.js'],
                tasks: ["requirejs"],
                options: {
                    nospawn: true,
                    livereload: false
                }
            },
            /*对于app.js相关依赖javascript改动的监控*/
            app_js: {
                files: ['jssrc/*.js'],
                tasks: ["concat:public", "uglify:public"],
                options: {
                    nospawn: true,
                    livereload: false
                }
            }
        },

        concurrent: {
            options: {
                logConcurrentOutput: true
            },
            dev: {
                tasks: ["watch:business_less", "watch:app_less", "watch:business_js", "watch:app_js"]
            }
        },
        requirejs: req
    });
    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
     加载grunt插件
     -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-contrib-requirejs');


    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
     注册并执行任务
     -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    grunt.registerTask("default", ["concurrent:dev"]);
    grunt.registerTask("buildjs", ["requirejs"]);


    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    watch event 的监控处理
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    grunt.event.on("watch", function(action, filePath, target) {
        var dest, src;
        var filesArray = new Array(); //需要Build的文件数组
        var obj = {}; //定义一个空对象

        // grunt.log.writeln("action:" + action);
        grunt.log.writeln("filePath:" + filePath);
        // grunt.log.writeln("target:" + target);

        if (target === "business_less") {
            src = filePath.replace(/\\/g, "\/");
            dest = src.replace('less', 'css').replace('.less', '.min.css');
            obj[dest] = src;
            filesArray.push(obj);
            grunt.config.set("less.one.files", filesArray);
        } else if (target === "business_js") {
            src = filePath.replace(/\\/g, "\/");
            dest = src.replace('jssrc', 'js').replace('.js', '.min.js');
            obj[dest] = src;
            filesArray.push(obj);
            grunt.config.set("uglify.one.files", filesArray);
            grunt.config.set("less.one.files", {});
        }
    });
};
