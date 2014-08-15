'use strict';

/* global describe, it */

var
	assert = require('assert'),
	_ = require('lodash'),
	M = require('../offline-npm').cli;

describe('#cli', function() {

	it('show help', function() {
		var cli = _.clone(M, true)
		process.argv[2] = '--help';
		cli
			.help('this is a help text')
			.parse();

		assert.deepEqual(cli._store.help, [ '    this is a help text' ]);
	});

	it('show version', function() {
		var cli = _.clone(M, true)
		process.argv[2] = '-v';
		cli
			.version('0.0.1-a')
			.help('this is a help text')
			.parse();

		assert.deepEqual(cli._store.version, '0.0.1-a');
	});

	it('parse one option', function() {
		var cli = _.clone(M, true)
		process.argv[2] = '-t';
		cli
			.option('-t', '--test', 'this is a test')
			.parse();
			
		assert.deepEqual(cli.opts, { test: true });
		assert.deepEqual(cli._store.help, ["    -t , --test        : this is a test" ]);
	});

	it('parse one option in long format', function() {
		var cli = _.clone(M, true)
		process.argv[2] = '--test';
		cli
			.option('-t', '--test', 'this is a test')
			.parse();
			
		assert.deepEqual(cli.opts, { test: true });
	});

	it('parse one option with optional [path]', function() {
		var cli = _.clone(M, true)
		process.argv[2] = '-t';
		process.argv[3] = 'this/path';
		cli
			.option('-t', '--test', 'requires a [path]', 'string')
			.parse();
		assert.deepEqual(cli.opts, { test: 'this/path' });
	});

	it('parse one option without optional [path]', function() {
		var cli = _.clone(M, true)
		process.argv[2] = '-t';
		process.argv[3] = '--another-opt';
		cli
			.option('-t', '--test', 'requires a [path]', 'string')
			.parse();
		assert.deepEqual(cli.opts, { test: true });
	});

});
