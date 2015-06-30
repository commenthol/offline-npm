'use strict';

var	request = require('request'),
	semver = require('semver'),
	five = require('five'),
	_m = require('mergee');

console.log('semver:', semver.gt('0.0.1', '0.0.0'));

console.log('five:', five());

console.log('mergee:', _m.pick({ a:1, b:2}, 'a'));

request('http://www.duckduckgo.com', function (err, res, body) {
	if (!err && res.statusCode == 200) {
		console.log('request:', body.replace(/^[^]*(<title[^]*?<\/title>)[^]*$/m, '$1')); // Print the web page.
	}
	else {
		if (res && res.statusCode) {
			console.log('request:', res.statusCode);
		}
		if (err) {
			console.log(err);
		}
	}
});

