#!/usr/bin/env node

'use strict';

/* jshint node:true */

var	fs = require('fs'),
	path = require('path'),
	http = require('http'),
	exec = require('child_process').exec,
	npm = requireNpm();

/*
 * configuration settings
 */
var	config = {
	port: 4873,
};
config.npm = {
	prepublish: {
		'cache'    : path.join(__dirname, 'cache')
	}
};

var DEBUG = false;

// ---------------------------------------------------------------------
// file operations
// ---------------------------------------------------------------------
/*
 * current working directory
 */ 
function pwd () {
	return path.resolve(process.cwd());
}

/*
 * make directories if they do not yet exists
 */
function mkdir (dir) {
  var	tmp = '',
		dirs = dir.split(path.sep);

	dirs.forEach(function(d){
		tmp += path.sep + d; 
		if (! fs.existsSync(tmp)) {
			fs.mkdirSync(tmp, parseInt('0777', 8));
		}
	});
}

/*
 * remove a directory
 * credits go to http://github.com/arturadib/shelljs
 */
function rmdir (dir, force) {
  var files;
	var result;

	function isWriteable(file) {
		var writePermission = true;
		try {
			var __fd = fs.openSync(file, 'a');
			fs.closeSync(__fd);
		} catch(e) {
			writePermission = false;
		}

		return writePermission;
	}

	try {
		files = fs.readdirSync(dir);

		// Loop through and delete everything in the sub-tree after checking it
		for(var i = 0; i < files.length; i++) {
			var file = dir + "/" + files[i],
					currFile = fs.lstatSync(file);

			if(currFile.isDirectory()) { // Recursive function back to the beginning
				rmdir(file, force);
			}

			else if(currFile.isSymbolicLink()) { // Unlink symlinks
				if (force || isWriteable(file)) {
					try {
						fs.unlinkSync(file);
					} catch (e) {
						log.error('could not remove file (code '+e.code+'): ' + file, true);
					}
				}
			}

			else // Assume it's a file - perhaps a try/catch belongs here?
				if (force || isWriteable(file)) {
					try {
						fs.unlinkSync(file);
					} catch (e) {
						log.error('could not remove file (code '+e.code+'): ' + file, true);
					}
				}
		}

		// Now that we know everything in the sub-tree has been deleted, we can delete the main directory.
		// Huzzah for the shopkeep.

		try {
			result = fs.rmdirSync(dir);
		} catch(e) {
			log.error('could not remove directory (code '+e.code+'): ' + dir, true);
		}
	}
	catch (e) {}

  return result;
} // rmdir

/*
 * copy files
 * credits go to http://github.com/arturadib/shelljs
 */
function cp (srcFile, destFile) {
  if (!fs.existsSync(srcFile))
    log.error('cp: no such file or directory: ' + srcFile);

  var BUF_LENGTH = 64*1024,
      buf = new Buffer(BUF_LENGTH),
      bytesRead = BUF_LENGTH,
      pos = 0,
      fdr = null,
      fdw = null;

  try {
    fdr = fs.openSync(srcFile, 'r');
  } catch(e) {
    log.error('cp: could not read src file ('+srcFile+')');
  }

  try {
    fdw = fs.openSync(destFile, 'w');
  } catch(e) {
    log.error('cp: could not write to dest file (code='+e.code+'):'+destFile);
  }

  while (bytesRead === BUF_LENGTH) {
    bytesRead = fs.readSync(fdr, buf, 0, BUF_LENGTH, pos);
    fs.writeSync(fdw, buf, 0, bytesRead);
    pos += bytesRead;
  }

  fs.closeSync(fdr);
  fs.closeSync(fdw);

  fs.chmodSync(destFile, fs.statSync(srcFile).mode);
}

// ---------------------------------------------------------------------
// find modules
// ---------------------------------------------------------------------
/*
 * detect and load npm
 */
function requireNpm () {
	// it is assumed that npm is always installed alongside with node 
	var
		npm,
		npmBinPath,
		npmPath,
		binDir = path.dirname(process.execPath),
		npmBin = path.join(binDir, 'npm');

	try {
		npm = require('npm'); // maybe the NODE_PATH var is already set correctly
		return npm;
	}
	catch (e) {
		if (fs.existsSync(npmBin) && fs.lstatSync(npmBin).isSymbolicLink()) {
			npmBinPath = path.resolve(binDir, fs.readlinkSync(npmBin));
			npmPath = npmBinPath.replace(/^(.*\/node_modules\/npm)(?:(?!\/node_modules\/npm).)*?$/, '$1');
			npm = require(npmPath);  // if the assumption is wrong, then an assertion is thrown here
			return npm;
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
	_option: {},
	_help: [],
	_strip: function (str) {
		return str.replace(/-/g, '');
	},
	help: function(str) {
		this._help.push(this._space + str);
		return this;
	},
	option: function (short, long, desc, arg) {
		var s = this._strip(long);
		this._option[s] = { desc: desc, arg: arg };
		if (short !== '') {
			this._option[this._strip(short)] = { long: s };
			this._help.push(this._space + short + ' , ' + long + ' : ' + desc);
		}
		else {
			this._help.push(this._space +  '     ' + long + ' : ' + desc);
		}
		return this;
	},
	parse: function () {
		var i, r, s,
			argv = process.argv;

		for (i = 2; i < argv.length; i+=1) {
			s = this._strip(argv[i]);
			r = this._option[s];
			// print out help
			if (s === 'h' || s === 'help' ) {
				console.log('\n' + this._help.join('\n') + '\n');
				this.exit = true;
				return;
			}
			if (r) {
				if (r.long) {
					s = r.long;
					r = this._option[r.long];
				}
				if (r.arg !== undefined) {
					var arg = argv[i+1];
					if (! /^-/.test(arg) && typeof arg === r.arg) {
						this.opts[s] = arg;
						i += 1;
					}
					else {
						this.opts[s] = true;
					}
				}
				else {
					this.opts[s] = true;
				}
			}
		}
	}
};

/*
 * a simple logger
 */
var log = {
	error: function(msg, _continue) {
		console.error('\n    Error: ' + msg + '\n');
		if (! _continue ) {
			console.trace();
			process.exit(1);
		}
	},
	info: function(msg) {
		console.log('    ' + msg);
	}
};

// ---------------------------------------------------------------------
// npm, package.json, semver
// ---------------------------------------------------------------------
/*
 * handle fs operations on package.json
 */
var packageJson = {
	read: function(cb) {
		var	filename = path.join(pwd(), 'package.json');

		fs.exists(filename, function (exists) {
			if (!exists) {
				return log.error(pwd() + ' does not contain a package.json file');
			}
			fs.readFile(filename, 'utf8', function (err, data) {
				var pckg;
				if (err) {
					return log.error(err.message);
				}
				try {
					pckg = JSON.parse(data);
				}
				catch (e) {
					return log.error('Could not parse package.json ' + e.message);
				}
				cb(pckg);
			});
		});
	},
	write: function (data, cb) {
		var	filename = path.join(pwd(), 'package.json');

		fs.writeFile(filename, JSON.stringify(data, null, '  '), function (err) {
			if (err) {
				return log.error('Could not write package.json ' + err.message);
			}
			if (cb) { cb(); }
		});
	},
};

/*
 * handle stuff related to npmrc
 */
var npmrc = function (npm, config) {
	var	self = {};
	self._npmBackup = {};

	self.backup = function() {
		for (var key in config) {
			self._npmBackup[key] = npm.config.get(key);
		}
	};

	self.restore = function() {
		for (var key in self._npmBackup) {
			npm.config.set(key, self._npmBackup[key]);
		}
	};

	self.set = function() {
		for (var key in config) {
			npm.config.set(key, config[key]);
		}
	};

	self.backup();

	return self;
};

/*
 * A semver parser to correctly sort for "latest" version
 * Follows spec on <http://semver.org/>
 */
var semver = {
	int: function (n) {
		return parseInt(n, 10);
	},
	preRel: function (p) {
		if (p) {
			p = p.split('.');
			return p.map(function(n){
				if (/^\d+$/.test(n)) {
					n = semver.int(n);
				}
				return n;
			});
		}
		return;
	},
	version: function (v) {
		var o;
		
		v.replace(/^(\d+)\.(\d+)\.(\d+)(?:\-([a-zA-Z0-9\.\-]*)?(?:\+(.*))?)?/, function(m, a0, a1, a2, pre){
			o = { rel: [a0, a1, a2], pre: semver.preRel(pre) };
			o.rel = o.rel.map(semver.int);
		});

		return o;
	},
	sortVersion: function (a, b) {
		for (var i = 0; i < a.length; i+=1 ) {
			if (a[i] !== b[i]) {
				return (b[i] - a[i]);
			}
		}
		return 0;
	},
	sortPreRel: function (a, b) {
		var min, r;
		if (!a) { return -1; }
		if (!b) { return  1; }

		min = ( a.length < b.length ? a.length : b.length ); 

		for (var i = 0; i < min; i+=1 ) {
			if (a[i] !== b[i]) {
				r = b[i] - a[i];
				if (isNaN(r)) {
					if (b[i] < a[i]) { return -1; }
					if (b[i] > a[i]) { return  1; }
				}
				else {
					return r;
				}
			}
		}
		if (a.length > min) { return -1; }
		if (b.length > min) { return  1; }
		
		return 0;
	},
	sort: function (a, b) {
		var	r,
			_a = semver.version(a),
			_b = semver.version(b);

		if (!_a) { return  1; }
		if (!_b) { return -1; }

		r = semver.sortVersion(_a.rel, _b.rel);
		if (r !== 0) { return r; }

		r = semver.sortPreRel(_a.pre, _b.pre);
		return r;
	}
};

// ---------------------------------------------------------------------
// npm registry server
// ---------------------------------------------------------------------
/*
 * serve the files from the npm cache as npm registry
 */
var server = {	
	pack: function (cache, name, cb) {
		var p = { name: name, versions: {} };
		var dir = cache + '/' + name;
		fs.readdir(dir, function(err, versions){
			var	vv = [],
				cnt = 0;
			
			if (err) {
				return cb(err);
			}

			function done() {
				if (cnt === versions.length) {
					p['dist-tags'] = {
						latest: vv.sort(semver.sort)[0]
					};
					
					//~ if (DEBUG) console.log(JSON.stringify(p, null, '  '));
					cb(null, p);
				}
				else {
					cnt += 1;
					load(versions[cnt])
				}
			}

			function load(version) {
				var pj = dir + '/' + version + '/package/package.json';
				fs.readFile(pj, { encoding: 'utf8'}, function(err, data) {
					var pck;
					if (err) {
						return done();
					}
					vv.push(version);
					pck = JSON.parse(data);
					pck.from = pck._from || ".";
					pck.dist = {};
					if (pck._shasum) {
						pck.dist.shasum = pck._shasum;
					}
					pck.dist.tarball = 'http://localhost:' + config.port + '/' + name + '/-/' + name + '-' + version + '.tgz';
					delete(pck.readme);
					delete(pck._from);
					delete(pck._shasum);
					delete(pck._resolved);
					p.versions[version] = pck;
					if (DEBUG) {
						console.log (name, version, pck.dist.tarball);
					}
					done();
				});
			}

			load (versions[cnt])
			
		});
	},
	error404: function (res) {
		res.writeHead(404);
		res.end();
	},
	files: function (options){
		var	self = this,
			REGEX_TGZ = /^\/([^\/]+)\/-\/(?:(?!\d+\.\d+\.\d+).)*\-(\d+\.\d+\.\d+.*)\.tgz$/;
			
		options = options || {};
		options.path = options.path || '/';
		options.base = path.normalize(options.base || '/');

		return function(req, res) {
			var	file,
				stream;

			// check routing - options.path needs to be part of req.url
			if (req.url.indexOf(options.path) === 0) {
				file = options.base + '/' + req.url.substr(options.path.length, req.url.length);

				if (DEBUG) console.log (req.url, file);

				if (/^\/[^\/]+$/.test(req.url)) {
					var name = req.url.replace(/\//, '');
					var p = self.pack(options.base, name, function(err, p){
						if (err) {
							return error404(res);
						}
						res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8' });
						res.end(JSON.stringify(p, null, '  '));
					});
				}
				else if (REGEX_TGZ.test(req.url)) {

					req.url.replace(REGEX_TGZ, function(m, name, version) {
						file = path.join(options.base, name, version, 'package.tgz');
					});
										
					// check if the file exists
					fs.exists(file, function (exists) {
						//~ console.log('INFO', file);
						if (exists) {

							var stat = fs.statSync(file);

							if (stat.isFile()) {
								stream = fs.createReadStream(file);
								res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
								stream.on('data', function(chunk){
									res.write(chunk);
								});
								stream.on('end', function(){
									res.end();
								});
							}
						}
						else {
							//~ console.log('INFO', 'file not exists', file);
							return error404(res);
						}
					});
				}
				else {
					return error404(res);
				}
			}
			else {
				return error404(res);
			}
		};
	},
	start: function (cache) {
		var self = this;
		// create and start-up the server with the chained middlewares
		http.createServer(self.files({ path: '/', base: cache })).listen(config.port);
		console.log('Server running on port:' + config.port + ' using cache in ' + cache);
	}
};

/*
 * the offline script
 */
var offline = {
	_server: null,
	_cmds:  ['prepublish', 'preinstall', 'postinstall'],
	_dir: 'offline',
	_pidfile: path.join(__dirname, 'offline.pid'),
	_script: './offline/offline-npm',
	_regex: /\s*\.\/offline\/offline-npm (?:(?!;|&&).)*(;|&&\s*|$)\s*/g,
	/**
	 * check if script was called from global install or local
	 */
	_globalScript: function () {
		var pathToJs = __dirname.split(path.sep);
		if (pathToJs.length > 1 && (pathToJs[pathToJs.length-1] === this._dir)) {
			return false;
		}
		return true;
	},
	/**
	 * call on publish
	 */
	prepublish: function(){
		npm.load(function (err, _npm) {
			var n;
			if (!err) {
				n = npmrc(_npm, config.npm.prepublish);
				n.set();
				rmdir(path.join(__dirname, 'cache'));
				mkdir(path.join(__dirname, 'cache'));
				rmdir(path.join(__dirname, '..', 'node_modules'));

				packageJson.read(function(data){
					var	i,
						count,
						packages = [];

					if (data.dependencies) {
						for (i in data.dependencies) {
							packages.push(i);
						}
						//~ console.error(packages)
						_npm.commands.install( packages, function(){
							n.restore();
						});
					}
				});
			}
		});
	},
	/**
	 * to be called on install
	 * Change the npm registry to localhost:port
	 * Start a fake registry server
	 */
	preinstall: function(){
		var self = this;

		// TODO - delete all npm-shrinkwraps -- assumes you are on a UNIX machine
		exec('find .. -iname "npm-shrinkwrap.json" | xargs rm -f',   function (error, stdout, stderr) {});

		// explicitely set registry
		exec('npm config set registry ' + 'http://localhost:' + config.port +'/', function(){});

		// start the npm registry using the cache
		self.server();
	},
	/**
	 * to be called on postinstall
	 * delete the offline folder
	 */
	postinstall: function(){
		var pid;
		
		if (fs.existsSync(this._pidfile)) {
			pid = fs.readFileSync(this._pidfile, 'utf8');
			try {
				process.kill(pid);
			}
			catch(e){}
		}
		if (! this._globalScript()) {
			rmdir(__dirname);
		}
	},
	/**
	 * add scripts to `package.json`
	 */
	add: function(){
		var	self = this;

		packageJson.read(function(data){
			if (! data.scripts) { data.scripts = {}; }

			self._cmds.forEach(function(s){
				var	sep = ( s === 'preinstall' ? ' & sleep 2 ; ' : ' ; '),
					tmp = data.scripts[s];

				if (tmp) {
					data.scripts[s] = self._script + ' --' + s + sep + tmp.replace(self._regex, '');
				}
				else {
					data.scripts[s] = self._script + ' --' + s + sep;
				}
			});
			packageJson.write(data, function(){
				if (self._globalScript()) {
					mkdir(path.join(pwd(), 'offline', 'cache'));
					cp(process.mainModule.filename, path.join(pwd(), 'offline', 'offline-npm'));
				}
				else {
					mkdir(path.join(__dirname, 'cache'));
				}
				log.info('offline-npm was added to project: ' + data.name);
			});

		});
	},
	/**
	 * remove offline scripts from `package.json`
	 */
	remove: function() {
		var	self = this;

		packageJson.read(function(data){
			var	tmp;

			if (! data.scripts) { data.scripts = {}; }

			self._cmds.forEach(function(s){
				tmp = data.scripts[s];
				if (typeof tmp === 'string') {
					data.scripts[s] = tmp.replace(self._regex, '');
					if (data.scripts[s] === '') {
						delete(data.scripts[s]);
					}
				}
			});

			packageJson.write(data);

			if (! self._globalScript()) {
				rmdir(__dirname);
			}
			log.info('offline-npm was removed from project: ' + data.name);
		});
	},
	/**
	 * starts the local npm registry server
	 */
	server: function() {
		var self = this;
		var dir = typeof cli.opts.server === 'string' ? path.resolve(__dirname, cli.opts.server) : __dirname + '/cache/'
		try {
			if (fs.existsSync(dir) &&
				fs.lstatSync(dir).isDirectory() ) {
				server.start(dir);
				// write a pid file to kill the server on postinstall
				fs.writeFileSync(self._pidfile, process.pid, 'utf8');
			}
			else {
				log.error(dir + ' is not a directory - server did not start')
			}
		}
		catch(e){
			log.error(e);
		}
	}
};

// ---------------------------------------------------------------------
if (module === require.main) {
	(function(){
		cli
			.help('on the target machine set the npm registry manually with')
			.help('npm config set registry http://localhost:'+config.port+'/')
			.help('')
			.option(''  , '--prepublish'  , 'call on prepublish')
			.option(''  , '--preinstall'  , 'call on preinstall')
			.option(''  , '--postinstall' , 'call on postinstall')
			.option('-a', '--add'         , 'add offline-npm to project')
			.option('-r', '--remove'      , 'remove from project')
			.option('-s', '--server'      , '[path] start npm registry server with registry in path', 'string')
			.option('-d', '--debug'       , 'show debug info')
			.parse();

		for (var i in cli.opts) {
			DEBUG = cli.opts.debug || false;
			
			if (offline[i]) {
				offline[i]();
				return; // only one option at a time allowed
			}
		}
	})();
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
};
