#!/usr/bin/env node

'use strict';

/// detect mocha
if (typeof describe === 'function') {
	return;
}

/// dependencies
var http = require('http'),
    url = require('url');

/// variables
var host = '127.0.0.1',
    port = 3000,
    server;

/// create the proxy server
server = http.createServer(function(req, res) {
  var _url,
      proxyReq,
      options;

  _url = url.parse(req.url);

  if (_url.port !== '4873') {
    _url.port = '8888';
  }

  // options required to set-up the proxy request
  options = {
    hostname: _url.hostname || 'localhost',
    port:     _url.port     || 80,
    method:   req.method    || 'GET',
    path:     _url.path     || '/',
    headers:  req.headers   || {},
  };

  // add x-forwarded-for header
  options.headers['x-forwarded-for'] = req.connection.remoteAddress;

  //~ console.log([ Date(), 'req', req.url, options.headers ]);

  // create a proxy request which shall handle the proxy response
  proxyReq = http.request(options, function(proxyRes) {
    //~ console.log([ Date(), 'proxyRes', proxyRes.headers ]);
    res.writeHead(proxyRes.statusCode, proxyRes.headers);

    // proxy the proxy response back
    proxyRes.on('data', function (chunk) {
      res.write(chunk, 'binary');
    });
    // pass-on end event
    proxyRes.on('end', function () {
      res.end();
    });
  });

  proxyReq.setTimeout(100);

  // exception handling for errors and timeouts
  proxyReq.on('error', function(err) {
    //~ console.log([ Date(), 'error', err.message ]);
    res.writeHead(500);
    res.write(err.message, 'utf-8');
    res.end();
  });
  proxyReq.on('timeout', function() {
    console.log([ Date(), 'timeout' ]);
    res.writeHead(408);
    res.write('timeout', 'utf-8');
    res.end();
  });

  // proxy the req
  req.on('data', function (chunk) {
    proxyReq.write(chunk, 'binary');
  });
  // pass-on end event
  req.on('end', function () {
    proxyReq.end();
  });
});

/// start the server
server.listen(port, host);

console.log('Proxy running at http://'+ host +':' + port + '/');
