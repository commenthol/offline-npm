#!/usr/bin/env node

'use strict';

/* jshint node:true */

var	fs = require('fs'),
	path = require('path'),
	http = require('http'),
	exec = require('child_process').exec,
	npm = require('npm');

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

// ---------------------------------------------------------------------
/*
 * current working directory
 */ 
function pwd () {
	return path.resolve(process.cwd());
};

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
				process.exit();
			}
			if (r) {
				if (r.long) {
					s = r.long;
					r = this._option[r.long];
				}
				if (r.arg !== undefined) {
					i += 1;
					this.opts[s] = argv[i] || true;
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

// ---------------------------------------------------------------------
/*
 * serve the files from the npm cache as npm registry
 */
var server = {
	pack: function (cache, name, cb) {
		var p = { name: name, versions: {} };
		var dir = cache + '/' + name;
		fs.readdir(dir, function(err, versions){
			var vv = [];
			//~ console.log(err,versions)
			
			if (err) {
				return cb(err);
			}

			versions.forEach(function(version){
				var pj = dir + '/' + version + '/package/package.json';
				if (fs.existsSync(pj)) {
					vv.push(version);
					var pck = JSON.parse(fs.readFileSync(pj, 'utf8'));
					pck.from = pck._from || ".";
					pck.dist = {
						shasum: pck._shasum,
						tarball: 'http://localhost:' + config.port + '/' + name + '/' + version + '/package.tgz'
					};
					delete(pck.readme);
					delete(pck._from);
					delete(pck._shasum);
					delete(pck._resolved);
					p.versions[version] = pck;
				}
			});
			p['dist-tags'] = {
				latest: vv.sort(function(a,b){return a < b;})[0]
			};
			
			//~ console.log(JSON.stringify(p, null, '  '));
			cb(null, p);
		});
	},
	files: function (options){
		var self = this;
		
		options = options || {};
		options.path = options.path || '/';
		options.base = options.base || '/';

		return function(req, res) {
			var
				file,
				stream;

			// check routing - options.path needs to be part of req.url
			if (req.url.indexOf(options.path) === 0) {
				file = options.base + req.url.substr(options.path.length, req.url.length);

				if (/^\/[^\/]+$/.test(req.url)) {
					var name = req.url.replace(/\//, '');
					var p = self.pack(options.base, name, function(err, p){
						if (err) {
							res.writeHead(404);
							res.end();
							return;
						}
						res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8' });
						res.end(JSON.stringify(p, null, '  '));
					});
				}
				else {
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
							res.writeHead(404);
							res.end();
						}
					});
				}
			}
			else {
				res.writeHead(404);
				res.end();
			}
		};
	},
	start: function (cache) {
		var self = this;
		// create and start-up the server with the chained middlewares
		http.createServer(self.files({ path: '/', base: cache })).listen(config.port);
		console.log('Server running on port:' + config.port);
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
		try {
			server.start(__dirname + '/cache/');
			// write a pid file to kill the server on postinstall
			fs.writeFileSync(self._pidfile, process.pid, 'utf8');
		}
		catch(e){
			log.error(e);
		}
	}
};

// ---------------------------------------------------------------------
/*
 * the main program
 */
function main () {
	var	i;

	for (i in cli.opts) {
		if (offline[i]) {
			offline[i]();
			return; // only one option at a time allowed
		}
	}
}

cli
	.help('on the target machine set the npm registry manually with')
	.help('npm config set registry http://localhost:'+config.port+'/')
	.help('')
	.option(''  , '--prepublish'  , 'call on prepublish')
	.option(''  , '--preinstall'  , 'call on preinstall')
	.option(''  , '--postinstall' , 'call on postinstall')
	.option('-a', '--add'         , 'add offline-npm to project')
	.option('-r', '--remove'      , 'remove from project')
	.option('-s', '--server'      , 'start only npm registry server')
	.parse();

main();
