#!/usr/bin/env node

'use strict'

/* jshint node:true */

var fs = require('fs')
var path = require('path')
var http = require('http')
var npm = requireNpm()

var VERSION = '0.2.1'

/*
 * configuration settings
 */
var config = {
  port: 4873
}
config.npm = {
  prepublish: {
    'cache': path.join(__dirname, 'cache')
  }
}

// ---------------------------------------------------------------------
// file operations
// ---------------------------------------------------------------------
/*
 * current working directory
 */
function pwd () {
  return path.resolve(process.cwd())
}

/*
 * make directories if they do not yet exists
 * credits to https://github.com/substack/node-mkdirp
 */
function mkdir (dir, made) {
  var mode = parseInt('0777', 8) & (~process.umask())

  dir = path.resolve(dir)

  try {
    fs.mkdirSync(dir, mode)
    made = made || dir
  } catch (e) {
    switch (e.code) {
      case 'ENOENT': {
        made = mkdir(path.dirname(dir), made)
        mkdir(dir, made)
        break
      }
      default: {
        var stat
        try {
          stat = fs.statSync(dir)
        } catch (e1) {
          throw e
        }
        if (!stat.isDirectory()) throw e
        break
      }
    }
  }
  return made
}

/*
 * remove a directory
 * credits go to http://github.com/arturadib/shelljs
 */
function rmdir (dir, force) {
  var files
  var result

  function isWriteable (file) {
    var writePermission = true
    try {
      var __fd = fs.openSync(file, 'a')
      fs.closeSync(__fd)
    } catch (e) {
      writePermission = false
    }

    return writePermission
  }

  try {
    files = fs.readdirSync(dir)

    // Loop through and delete everything in the sub-tree after checking it
    for (var i = 0; i < files.length; i++) {
      var file = path.join(dir, files[i])
      var currFile = fs.lstatSync(file)

      if (currFile.isDirectory()) { // Recursive function back to the beginning
        rmdir(file, force)
      } else if (currFile.isSymbolicLink()) { // Unlink symlinks
        if (force || isWriteable(file)) {
          try {
            fs.unlinkSync(file)
          } catch (e) {
            log.error('could not remove file (code ' + e.code + '): ' + file, true)
          }
        }
      } else { // Assume it's a file - perhaps a try/catch belongs here?
        if (force || isWriteable(file)) {
          try {
            fs.unlinkSync(file)
          } catch (e) {
            log.error('could not remove file (code ' + e.code + '): ' + file, true)
          }
        }
      }
    }

    // Now that we know everything in the sub-tree has been deleted, we can delete the main directory.
    // Huzzah for the shopkeep.

    try {
      result = fs.rmdirSync(dir)
    } catch (e) {
      log.error('could not remove directory (code ' + e.code + '): ' + dir, true)
    }
  } catch (e) {}

  return result
} // rmdir

/*
 * copy files
 * credits go to http://github.com/arturadib/shelljs
 */
function cp (srcFile, destFile) {
  if (!fs.existsSync(srcFile)) {
    log.error('cp: no such file or directory: ' + srcFile)
  }

  var BUF_LENGTH = 64 * 1024
  var buf = new Buffer(BUF_LENGTH)
  var bytesRead = BUF_LENGTH
  var pos = 0
  var fdr = null
  var fdw = null

  try {
    fdr = fs.openSync(srcFile, 'r')
  } catch (e) {
    log.error('cp: could not read src file (' + srcFile + ')')
  }

  try {
    fdw = fs.openSync(destFile, 'w')
  } catch (e) {
    log.error('cp: could not write to dest file (code=' + e.code + '):' + destFile)
  }

  while (bytesRead === BUF_LENGTH) {
    bytesRead = fs.readSync(fdr, buf, 0, BUF_LENGTH, pos)
    fs.writeSync(fdw, buf, 0, bytesRead)
    pos += bytesRead
  }

  fs.closeSync(fdr)
  fs.closeSync(fdw)

  fs.chmodSync(destFile, fs.statSync(srcFile).mode)
}

// ---------------------------------------------------------------------
// find modules
// ---------------------------------------------------------------------
/*
 * detect and load npm
 */
function requireNpm () {
  // it is assumed that npm is always installed alongside with node
  var npm
  var npmBinPath
  var npmPath
  var binDir = path.dirname(process.execPath)
  var npmBin = path.join(binDir, 'npm')

  try {
    npm = require('npm') // maybe the NODE_PATH var is already set correctly
    return npm
  } catch (e) {
    if (fs.existsSync(npmBin) && fs.lstatSync(npmBin).isSymbolicLink()) {
      npmBinPath = path.resolve(binDir, fs.readlinkSync(npmBin))
      npmPath = npmBinPath.replace(/^(.*\/node_modules\/npm)(?:(?!\/node_modules\/npm).)*?$/, '$1')
      npm = require(npmPath)  // if the assumption is wrong, then an assertion is thrown here
      return npm
    }
  }
}

// ---------------------------------------------------------------------
// program
// ---------------------------------------------------------------------
/*
 *  a very very basic command line parser
 */
var cli = {
  opts: {},
  _space: '    ',
  _store: {
    version: null,
    option: {},
    help: []
  },
  _strip: function (str) {
    return str.replace(/-/g, '')
  },
  version: function (str) {
    this._store.version = str
    this.option('-v', '--version', 'show version')
    return this
  },
  help: function (str) {
    this._store.help.push(this._space + str)
    return this
  },
  option: function (short, long, desc, arg) {
    var s = this._strip(long)
    var spc = '              '.substr(0, (13 - long.length))

    this._store.option[s] = { desc: desc, arg: arg }
    if (short !== '') {
      this._store.option[this._strip(short)] = { long: s }
      this._store.help.push(this._space + short + ' , ' + long + spc + ' : ' + desc)
    } else {
      this._store.help.push(this._space + '     ' + long + spc + ' : ' + desc)
    }
    return this
  },
  parse: function () {
    var i
    var r
    var s
    var argv = process.argv

    for (i = 2; i < argv.length; i += 1) {
      s = this._strip(argv[i])
      r = this._store.option[s]
      // print out help
      if (s === 'h' || s === 'help') {
        console.log('\n' + this._store.help.join('\n') + '\n')
        this.exit = true
        return
      }
      // print out version
      if (s === 'v' || s === 'version') {
        console.log(this._store.version)
        this.exit = true
        return
      }
      if (r) {
        if (r.long) {
          s = r.long
          r = this._store.option[r.long]
        }
        if (r.arg !== undefined) {
          var arg = argv[i + 1]
          if (!/^-/.test(arg) && typeof arg === r.arg) {
            this.opts[s] = arg
            i += 1
          } else {
            this.opts[s] = true
          }
        } else {
          this.opts[s] = true
        }
      }
    }
  }
}

/*
 * a simple logger
 */
var log = {
  _debug: true,
  error: function (msg, _continue) {
    console.error('\n    Error: ' + msg + '\n')
    if (!_continue) {
      console.trace()
      process.exit(1)
    }
  },
  info: function (msg) {
    console.log('    ' + msg)
  },
  debug: function () {
    if (this._debug) {
      var args = Array.prototype.slice.call(arguments)
      console.log.apply(this, args)
    }
  }
}

// ---------------------------------------------------------------------
// npm, package.json, semver
// ---------------------------------------------------------------------
var FsJson = function (filename) {
  if (!(this instanceof FsJson)) {
    return new FsJson(filename)
  }
  this.filename = filename
}
FsJson.prototype = {
  read: function (cb) {
    var _this = this
    var filename = path.join(pwd(), _this.filename)

    fs.readFile(filename, 'utf8', function (err, data) {
      var obj
      if (err) {
        cb(err)
        return
      }
      try {
        obj = JSON.parse(data)
      } catch (e) {
        cb(err)
        return
      }
      cb(null, obj)
    })
  },
  write: function (data, cb) {
    var _this = this
    var filename = path.join(pwd(), _this.filename)

    fs.writeFile(filename, JSON.stringify(data, null, '  '), function (err) {
      if (cb) { cb(err) }
    })
  }
}

/*
 * handle fs operations on package.json
 */
var packageJson = {
  _name: 'package.json',
  read: function (cb) {
    var _this = this
    FsJson(_this._name).read(function (err, data) {
      if (err) {
        log.error(_this._name + ' failed to read or parse: ' + err.message)
        return
      } else {
        cb(null, data)
      }
    })
  },
  write: function (data, cb) {
    var _this = this
    FsJson(_this._name).write(data, function (err) {
      if (err) {
        log.error(_this._name + ' failed to write: ' + err.message)
      }
      if (cb) cb(err)
    })
  }
}

/**
 * handle the shrinkwrap file
 */
var shrinkwrap = {
  _name: 'npm-shrinkwrap.json',
  /**
   * read the file
   */
  read: function (cb) {
    FsJson(this._name).read(cb)
  },
  /**
   * write the file
   */
  write: function (data, cb) {
    FsJson(this._name).write(data, cb)
  },

  /**
   * backup npm-shrinkwrap.json to offline dir
   */
  backup: function (prepublish) {
    var fileOrg = path.join(pwd(), this._name)
    var fileBak = path.join(pwd(), offline._dir, this._name)

    if (!fs.existsSync(fileOrg)) {
      if (prepublish && fs.existsSync(fileBak)) {
        fs.unlinkSync(fileBak)
      }
      return false
    } else if (!fs.existsSync(fileBak)) {
      cp(fileOrg, fileBak)
      return true
    }
  },
  /**
   * if exists npm-shrinkwrap.json restore to main dir
   */
  restore: function () {
    var fileGen = path.join(pwd(), this._name)
    var fileBak = path.join(pwd(), offline._dir, this._name)

    if (fs.existsSync(fileBak)) {
      cp(fileBak, fileGen)
      return true
    } else if (fs.existsSync(fileGen)) {
      fs.unlinkSync(fileGen)
    }
  },
  /**
   * parse npm-shrinkwrap and change resolved property
   */
  parse: function (obj) {
    var name
    if (obj) {
      for (name in obj) {
        if (obj[name].resolved) {
          obj[name].resolved = server.packageUrl(name, obj[name].version)
        }
        if (obj[name].dependencies) {
          obj[name].dependencies = shrinkwrap.parse(obj[name].dependencies)
        }
      }
    }
    return obj
  },
  /**
   * change the shrinkwrap file
   */
  change: function (cb) {
    var _this = this

    _this.read(function (err, obj) {
      if (!err && obj) {
        obj.dependencies = _this.parse(obj.dependencies)
        _this.write(obj, function () {
          if (cb) cb()
        })
      } else {
        if (cb) cb()
      }
    })
  }
}

/*
 * handle stuff related to npmrc
 */
var npmrc = function (npm, config) {
  var _this = {}
  _this._npmBackup = {}

  _this.backup = function () {
    for (var key in config) {
      _this._npmBackup[key] = npm.config.get(key)
    }
  }

  _this.restore = function () {
    for (var key in _this._npmBackup) {
      npm.config.set(key, _this._npmBackup[key])
    }
  }

  _this.set = function () {
    for (var key in config) {
      npm.config.set(key, config[key])
    }
  }

  _this.backup()

  return _this
}

/*
 * A semver parser to correctly sort for "latest" version
 * Follows spec on <http://semver.org/>
 */
var semver = {
  int: function (n) {
    return parseInt(n, 10)
  },
  preRel: function (p) {
    if (p) {
      p = p.split('.')
      return p.map(function (n) {
        if (/^\d+$/.test(n)) {
          n = semver.int(n)
        }
        return n
      })
    }
    return
  },
  version: function (v) {
    var o

    v.replace(/^(\d+)\.(\d+)\.(\d+)(?:\-([a-zA-Z0-9\.\-]*)?(?:\+(.*))?)?/, function (m, a0, a1, a2, pre) {
      o = { rel: [a0, a1, a2], pre: semver.preRel(pre) }
      o.rel = o.rel.map(semver.int)
    })

    return o
  },
  sortVersion: function (a, b) {
    for (var i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) {
        return (b[i] - a[i])
      }
    }
    return 0
  },
  sortPreRel: function (a, b) {
    var min, r
    if (!a) { return -1 }
    if (!b) { return 1 }

    min = (a.length < b.length ? a.length : b.length)

    for (var i = 0; i < min; i += 1) {
      if (a[i] !== b[i]) {
        r = b[i] - a[i]
        if (isNaN(r)) {
          if (b[i] < a[i]) { return -1 }
          if (b[i] > a[i]) { return 1 }
        } else {
          return r
        }
      }
    }
    if (a.length > min) { return -1 }
    if (b.length > min) { return 1 }

    return 0
  },
  sort: function (a, b) {
    var r
    var _a = semver.version(a)
    var _b = semver.version(b)

    if (!_a) { return 1 }
    if (!_b) { return -1 }

    r = semver.sortVersion(_a.rel, _b.rel)
    if (r !== 0) { return r }

    r = semver.sortPreRel(_a.pre, _b.pre)
    return r
  }
}

// ---------------------------------------------------------------------
// npm registry server
// ---------------------------------------------------------------------
/*
 * serve the files from the npm cache as npm registry
 */
var server = {
  packageUrl: function (name, version) {
    return 'http://localhost:' + config.port + '/' + name + '/-/' + name + '-' + version + '.tgz'
  },
  pack: function (cache, name, cb) {
    name = unescape(name)

    var _this = this
    var p = { name: name, versions: {} }
    var dir = cache + '/' + name

    fs.readdir(dir, function (err, versions) {
      var vv = []
      var cnt = 0

      if (err) {
        return cb(err)
      }

      function done () {
        if (cnt === versions.length) {
          p['dist-tags'] = {
            latest: vv.sort(semver.sort)[0]
          }

          // ~ log.debug(JSON.stringify(p, null, '  '));
          cb(null, p)
        } else {
          cnt += 1
          load(versions[cnt])
        }
      }

      function load (version) {
        var pj = dir + '/' + version + '/package/package.json'
        fs.readFile(pj, {encoding: 'utf8'}, function (err, data) {
          var pck
          if (err) {
            return done()
          }
          vv.push(version)
          pck = JSON.parse(data)
          pck.from = pck._from || '.'
          pck.dist = {}
          if (pck._shasum) {
            pck.dist.shasum = pck._shasum
          }
          pck.dist.tarball = _this.packageUrl(name, version)
          delete (pck.readme)
          delete (pck._from)
          delete (pck._shasum)
          delete (pck._resolved)
          p.versions[version] = pck
          // ~ log.debug('  >  ', name, version, pck.dist.tarball);
          done()
        })
      }

      load(versions[cnt])
    })
  },
  error404: function (req, res) {
    res.writeHead(404)
    res.end()
    log.debug('[' + (new Date()).toISOString() + ']', 404, req.url)
  },
  files: function (options) {
    var _this = this
    var REGEX_TGZ = /^\/([^\/]+)\/-\/(?:(?!\d+\.\d+\.\d+).)*\-(\d+\.\d+\.\d+.*)\.tgz$/

    options = options || {}
    options.path = options.path || '/'
    options.base = path.normalize(options.base || '/')

    return function (req, res) {
      var file,
        stream

      // check routing - options.path needs to be part of req.url
      if (req.url.indexOf(options.path) === 0) {
        file = options.base + '/' + req.url.substr(options.path.length, req.url.length)

        if (/^\/[^\/]+$/.test(req.url)) {
          file = req.url.replace(/\//, '')
          _this.pack(options.base, file, function (err, p) {
            if (err) {
              return _this.error404(req, res)
            }
            res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'})
            res.end(JSON.stringify(p, null, '  '))
            log.debug('[' + (new Date()).toISOString() + ']', 200, req.url, file)
          })
        } else if (REGEX_TGZ.test(req.url)) {
          req.url.replace(REGEX_TGZ, function (m, name, version) {
            file = path.join(options.base, name, version, 'package.tgz')
          })

          fs.stat(file, function (err, stat) {
            if (err || !stat.isFile()) {
              return _this.error404(req, res)
            }
            stream = fs.createReadStream(file)
            res.writeHead(200, { 'Content-Type': 'application/octet-stream' })
            stream.on('data', function (chunk) {
              res.write(chunk)
            })
            stream.on('end', function () {
              res.end()
              log.debug('[' + (new Date()).toISOString() + ']', 200, req.url, file)
            })
          })
        } else {
          return _this.error404(req, res)
        }
      } else {
        return _this.error404(req, res)
      }
    }
  },
  start: function (cache, cb) {
    var _this = this

    // create and start-up the server with the chained middlewares
    var server = http.createServer(_this.files({ path: '/', base: cache }))

    server.on('error', function (err) {
      if (err.code === 'EADDRINUSE') {
        log.error('Address in use, trying to use the running one ...', true)
      } else {
        log.error('There is something bad: ' + err.code + ': ' + err.message)
      }
    })

    server.listen(config.port, function () {
      log.info('Server running on port:' + config.port + ' using cache in ' + cache)
      cb && cb()
    })
  }
}

/*
 * the offline script
 */
var offline = {
  _server: null,
  _cmds: ['prepublish', 'preinstall', 'postinstall'],
  _dir: 'offline',
  _pidfile: path.join(__dirname, 'offline.pid'),
  _script: './offline/offline-npm',
  _regex: /\s*\.\/offline\/offline-npm (?:(?!;|&&).)*(;|&&\s*|$)\s*/g,
  /**
   * check if script was called from global install or local
   */
  _globalScript: function () {
    var pathToJs = __dirname.split(path.sep)
    if (pathToJs.length > 1 && (pathToJs[pathToJs.length - 1] === this._dir)) {
      return false
    }
    return true
  },
  /**
   * call on publish
   */
  prepublish: function () {
    npm.load(function (err, _npm) {
      var n
      if (!err) {
        n = npmrc(_npm, config.npm.prepublish)
        n.set()
        rmdir(path.join(__dirname, 'cache'))
        mkdir(path.join(__dirname, 'cache'))
        rmdir(path.join(__dirname, '..', 'node_modules'))

        shrinkwrap.restore()

        packageJson.read(function (err, data) {
          var i
          var packages = []

          if (err) {
            throw err
          }

          if (data.dependencies) {
            for (i in data.dependencies) {
              packages.push(i)
            }
            _npm.commands.install(packages, function () {
              n.restore()

              shrinkwrap.backup(true)
              _npm.commands.shrinkwrap([], function (err, data) {
                if (err) {
                  log.error('shrinkwrap error: ' + err.message)
                  return
                }
                shrinkwrap.change(function (/* err */) {
                })
              })
            })
          }
        })
      }
    })
  },
  /**
   * to be called on install
   * Change the npm registry to localhost:port
   * Start a fake registry server
   */
  preinstall: function () {
    // start the npm registry using the cache
    this.server()
  },
  /**
   * to be called on postinstall
   * deletes the offline folder
   */
  postinstall: function () {
    var pid

    if (fs.existsSync(this._pidfile)) {
      pid = fs.readFileSync(this._pidfile, 'utf8')
      try {
        process.kill(pid)
      } catch (e) {}
    }
    if (!this._globalScript()) {
      rmdir(__dirname)
    }
  },
  /**
   * add scripts to `package.json`
   */
  add: function () {
    var _this = this

    packageJson.read(function (err, data) {
      if (err) {
        log.error('no package.json file found')
        return
      }
      if (!data.scripts) { data.scripts = {} }

      _this._cmds.forEach(function (s) {
        var sep = (s === 'preinstall' ? ' & sleep 2 ; ' : ' ; ')
        var tmp = data.scripts[s]

        if (tmp) {
          data.scripts[s] = _this._script + ' --' + s + sep + tmp.replace(_this._regex, '')
        } else {
          data.scripts[s] = _this._script + ' --' + s + sep
        }
      })
      packageJson.write(data, function (err) {
        if (!err) {
          if (_this._globalScript()) {
            mkdir(path.join(pwd(), 'offline', 'cache'))
            cp(process.mainModule.filename, path.join(pwd(), 'offline', 'offline-npm'))
          } else {
            mkdir(path.join(__dirname, 'cache'))
          }
          shrinkwrap.backup()
          log.info('offline-npm was added to project: ' + data.name)
        } else {
          log.error('offline-npm COULD NOT be added to project: ' + data.name)
        }
      })
    })
  },
  /**
   * remove offline scripts from `package.json`
   */
  remove: function () {
    var _this = this

    packageJson.read(function (err, data) {
      var tmp

      if (err) {
        log.error('no package.json file found')
        return
      }

      shrinkwrap.restore()
      // delete the offline directory
      tmp = path.resolve(pwd(), _this._dir)
      if (fs.existsSync(tmp)) {
        rmdir(tmp)
      }

      if (!data.scripts) { data.scripts = {} }

      _this._cmds.forEach(function (s) {
        tmp = data.scripts[s]
        if (typeof tmp === 'string') {
          data.scripts[s] = tmp.replace(_this._regex, '')
          if (data.scripts[s] === '') {
            delete (data.scripts[s])
          }
        }
      })

      packageJson.write(data, function (err) {
        if (!err) {
          if (!_this._globalScript()) {
            rmdir(__dirname)
          }
          log.info('offline-npm was removed from project: ' + data.name)
        } else {
          log.error('offline-npm COULD NOT be removed from project: ' + data.name)
        }
      })
    })
  },
  /**
   * starts the local npm registry server
   */
  server: function () {
    var _this = this
    var dir = typeof cli.opts.server === 'string' ? path.resolve(__dirname, cli.opts.server) : path.resolve(__dirname, 'cache')
    try {
      if (fs.existsSync(dir) &&
        fs.lstatSync(dir).isDirectory()) {
        server.start(dir)
        // write a pid file to kill the server on postinstall
        fs.writeFileSync(_this._pidfile, process.pid, 'utf8')
      } else {
        log.error(dir + ' is not a directory - server did not start')
      }
    } catch (e) {
      log.error(e)
    }
  },
  /**
   * starts the local npm registry server using the npm cache
   */
  npmcache: function () {
    npm.load(function (err, npm) {
      if (err) console.error('npm error', err)
      var cache = npm.config.get('cache')
      server.start(cache, function () {
        log.info('export NPM_CONFIG_REGISTRY="http://localhost:' + config.port + '"')
      })
    })
  }
}

// ---------------------------------------------------------------------
if (module === require.main) {
  (function () {
    cli
      .option('', '--prepublish', 'call on prepublish')
      .option('', '--preinstall', 'call on preinstall')
      .option('', '--postinstall', 'call on postinstall')
      .option('-a', '--add', 'add offline-npm to project')
      .option('-r', '--remove', 'remove from project')
      .option('-n', '--npmcache', 'start npm registry using current npm cache')
      .option('-d', '--debug', 'show debug info')
      .option('-s', '--server', 'start npm registry server using [path]', 'string')
      .version(VERSION)
      .option('-h', '--help', 'print this help')
      .parse()

    // process switches
    log._debug = cli.opts.debug || false

    for (var i in cli.opts) {
      if (offline[i]) {
        offline[i]()
        return // only one option at a time allowed
      }
    }
  })()
}

module.exports = {
  cli: cli,
  log: log,
  semver: semver,
  server: server,
  offline: offline,
  npmrc: npmrc,
  requireNpm: requireNpm,
  packageJson: packageJson,
  shrinkwrap: shrinkwrap
}
