var _       = require("underscore")._,
    async   = require("async"),
    fs      = require("fs"),
    exec    = require("child_process").exec,
    config  = require("../config.json");

/*****************************************************************************\
    Return a set of functions which we can use to manage our dependencies
\*****************************************************************************/
module.exports = function() {

    // Check dependencies based on the input "deps" object.
    // deps will contain: {"binaries": [...], "files":[...]}
    _check_deps = function(deps, callback) {
        if (typeof(deps["binaries"]) == "undefined") {
            deps["binaries"] = [];
        }
        if (typeof(deps["files"]) == "undefined") {
            deps["files"] = [];
        }

        // Define functions to check our binary deps
        var check_exe_fns = _.map(deps["binaries"], function(bin_dep) {
            //console.log("Building || function for " + bin_dep);
            return function(callback) {
                exec("which " + bin_dep, function(error, stdout, stderr) {
                    if (error) return callback(error);
                    if (stdout == "") return callback("\"which " + bin_dep + "\" returned no valid binary");
                    return callback(null)
                });
            };
        });

        // Define functions to check our file deps
        var check_file_fns = _.map(deps["files"], function(file) {
            //console.log("Building || function for " + file);
            return function(callback) {
                fs.exists(file, function(exists) {
                    if (exists) return callback(null);
                    return callback(file + " does not exist");
                });
            };
        });

        // Dispatch the parallel functions
        async.series([
            function check_binaries(next_step) {
                async.parallel(check_exe_fns, next_step);
            },
            function check_files(next_step) {
                async.parallel(check_file_fns, next_step);
            },
        ], callback);
    };

    return {
        check_deps: _check_deps
    };
}
