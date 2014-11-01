/**
 * Sail - A CMD Environment
 *
 * compatible: IE8+ (fetures currentScript, defineProperty | __defineGetter__)
 *
 * @copyright (c) 2014 github.com/yanbingbing
 */
(function (global, undefined) {

    'use strict';

    var document = global.document;
    var RE_DIRNAME = /[^?#]*\//;
    function dirname(path) {
        return (RE_DIRNAME.exec(path) || ['./'])[0];
    }
    var cwd = dirname(global.location.href);
    var root = (/^.*?\/\/.*?\//.exec(cwd) || 0)[0];
    var cachedModules = {}, alias = {}, base = cwd;
    var toString = cachedModules.toString;

    function isFunction(obj) {
        return toString.call(obj) === '[object Function]';
    }
    var isArray = Array.isArray || function (obj) {
        return toString.call(obj) === '[object Array]';
    };

    var RE_IDLE_DOT = /\/\.\//g;
    var RE_DOUBLE_DOT = /\/[^/]+\/\.\.\//;
    var RE_MULTI_SLASH = /([^:/])\/+\//g;
    function normalize(path) {
        // /a/b/./c/./d ==> /a/b/c/d
        path = path.replace(RE_IDLE_DOT, "/");

        // a///b/////c ==> a/b/c
        path = path.replace(RE_MULTI_SLASH, '$1/');

        // a/b/c/../../d  ==>  a/b/../d  ==>  a/d
        while (RE_DOUBLE_DOT.test(path)) {
            path = path.replace(RE_DOUBLE_DOT, "/");
        }

        return path;
    }


    var RE_ABSOLUTE = /^\/\/.|:\//;
    function addBase(id, refUri) {
        var ret;
        var first = id[0];

        // Absolute
        if (RE_ABSOLUTE.test(id)) {
            ret = id;
        }
        // Relative
        else if (first === ".") {
            ret = (refUri ? dirname(refUri) : cwd) + id;
        }
        // Root
        else if (first === "/") {
            ret = root ? (root + id.substring(1)) : id;
        }
        // Top-level
        else {
            ret = (base || '') + id;
        }

        return normalize(ret);
    }

    var RE_END_SHARP = /(.*)#$/;
    var RE_END_RESERVED = /[?#]|\.(?:js|css)$|\/$/;
    function resolve(id, ref) {
        if (!id) return "";

        // parse alias
        if (alias && (typeof alias[id] == 'string')) {
            id = alias[id];
        }

        // fix path
        var m;
        // If the uri ends with `#`
        if (m = RE_END_SHARP.exec(id)) {
            id = m[1];
        } else if (!RE_END_RESERVED.test(id)) {
            id = id + '.js';
        }

        return addBase(id, ref);
    }

    function Module(id, factory) {
        this.id = id;
        this.uri = id;
        this.factory = factory;
        this.exports = null;
        this.status = 0;
        cachedModules[this.uri] = this;
    }

    Module.prototype.exec = function () {
        var mod = this;
        if (mod.status > 0) {
            return mod.exports;
        }

        mod.status = 1;

        var factory = mod.factory;
        var exports;
        if (isFunction(factory)) {
            mod.exports = {};
            setCurrentModule(mod);
            exports = factory(require, mod.exports, mod);
            setCurrentModule();
        } else {
            exports = factory;
        }

        if (exports !== undefined) {
            mod.exports = exports;
        }
        mod.status = 2;

        return mod.exports;
    };

    function defineGetter(name, getter) {
        try {
            Object.defineProperty(global, name, {
                get: getter
            });
        } catch (e) {
            global.__defineGetter__(name, getter);
        }
    }
    var currentModule, currentModuleSetted, currentReference;
    function getCurrentModule() {
        if (!currentModuleSetted) {
            var id = resolve(getId()),
                m = cachedModules[id];
            currentModule = m || define(id, {})();
        }
        return currentModule;
    }
    function setCurrentModule(module) {
        currentModule = module;
        if (module === undefined) {
            currentReference = null;
            currentModuleSetted = 0;
        } else {
            currentReference = module.uri;
            currentModuleSetted = 1;
        }
    }
    defineGetter('module', getCurrentModule);

    defineGetter('exports', function () {
        var module = getCurrentModule();
        if (module) {
            if (!('exports' in module)) {
                module.exports = {};
            }
            return module.exports;
        } else {
            return null;
        }
    });

    function getCurrentScript(_) {

        if (document.currentScript) {
            return document.currentScript.src;
        }

        var stack;
        try {
            _();
        } catch (e) {
            stack = e.stack;
        }
        if (stack) {
            stack = stack.split(/[@ ]/g).pop();
            stack = stack[0] == '(' ? stack.slice(1, -1) : stack;
            stack = stack.replace(/(:\d+){1,2}$/, '');
            return stack.indexOf('/') < 0 ? null : stack;
        }

        var scripts = document.getElementsByTagName("script");

        for (var i = scripts.length - 1; i >= 0; i--) {
            if (scripts[i].readyState === "interactive") {
                return scripts[i].src;
            }
        }
    }

    function getId() {
        return getCurrentScript() || '.';
    }

    var RE_JS = /\.js(?:[?#]|$)/;
    function require(id) {
        var id = require.resolve(id);
        if (RE_JS.test(id)) {
            var m = cachedModules[id];
            return m && m.exec();
        } else {
            return id;
        }
    }

    require.resolve = function (id) {
        return resolve(id, currentReference || resolve(getId()));
    };

    function define(id, deps, factory) {
        var argsLen = arguments.length;

        var curid = resolve(getId());
        if (argsLen < 2) {
            factory = id;
            id = curid;
        } else if (argsLen === 2) {
            factory = deps;
            if (isArray(id)) {
                id = curid;
            } else {
                id = resolve(id, curid);
            }
        } else {
            id = resolve(id, curid);
        }

        var mod = new Module(id, factory);
        return function () {
            mod.exec();
            return mod;
        };
    }

    define.config = function (config) {
        if (config.alias) {
            alias = config.alias;
        }
        if (config.base) {
            base = addBase(config.base.slice(-1) === '/' ? config.base : (config.base + '/'));
        }
    };

    global.define = define;
    global.require = require;

})(window);