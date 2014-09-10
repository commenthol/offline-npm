#!/bin/bash

pwd=$(pwd)
cwd=$(dirname $0)
npmOpts=""
#npmOpts="--verbose"

_cleanup () {
	cd $pwd/try
	test -f try-*.tgz && rm try-*.tgz
	test -f npm-shrinkwrap.json && rm npm-shrinkwrap.json
	test -d offline && rm -rf offline
	test -d node_modules && rm -rf node_modules
	cd $pwd/try/try-offline
	test -d node_modules && rm -rf node_modules
}

_assert () {
	echo Assert: $1
	_cleanup
	exit 1
}

_describe () {

	# test packaging
	_it_pack () {
		# cleanup & reset
		_cleanup
		cd $pwd/try
		export HTTP_PROXY=""
		../offline-npm.js -r
		
		# install packages
		npm $npmOpts install
		if [ ! -d node_modules ]; then
			_assert "npm install failed"
		fi

		node index.js | grep DuckDuck
		if [ $? != 0 ]; then
			_assert "index.js failed"
		fi
		../offline-npm.js -a

		if [ "x$1" = "xshrink" ]; then
			npm $npmOpts shrink
			if [ ! -f npm-shrinkwrap.json ]; then
				_assert "npm shrink failed"
			fi
		fi

		npm $npmOpts pack
		if [ ! -f try-0.0.0.tgz ]; then
			_assert "npm pack failed"
		fi
		../offline-npm.js -r
	}

	# test offline install
	_it_offline () {
		cd $pwd/try/try-offline
		# start proxy to simulate offline use
		node $pwd/test/proxy.js &
		proxyPid=$!
		echo $proxyPid
		export HTTP_PROXY="http://127.0.0.1:3000"
		test -d node_modules && rm -r node_modules
		test ! -d node_modules && mkdir node_modules
		npm install --registry=http://127.0.0.1:4873/ $npmOpts ../try-0.0.0.tgz
		if [ ! -d node_modules/try ]; then
			_assert "offline npm install failed"
		fi
		node node_modules/try/index.js | grep 408
		if [ $? != 0 ]; then
			kill $proxyPid
			_assert "offline index.js failed"
		fi
		kill $proxyPid
	}

	_it_pack $1
	_it_offline
}

_describe
_describe shrink
_cleanup
