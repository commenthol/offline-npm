'use strict';

var	request = require('request'),
	semver = require('semver');

console.log('semver:', semver.gt('0.0.1', '0.0.0'));

request('http://www.duckduckgo.com', function (err, res, body) {
  if (!err && res.statusCode == 200) {
    console.log('request:', body.replace(/^[^]*(<title[^]*?<\/title>)[^]*$/m, '$1')) // Print the web page.
  }
  else {
		if (res && res.statusCode) {
			console.log(res.statusCode);
		}
		if (err) {
			console.log(err);
		}
	}
})

