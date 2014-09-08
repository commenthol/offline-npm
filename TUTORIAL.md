# Tutorial

This little guide shall help you to understand using `offline-npm`.

There is a small project in folder `try` using two dependencies `semver` and `request`.
`request` itself has sub-dependencies which should be included into the final "offline" package as well.

**Conventions**

```bash
##  = this is line of comment
#>  = this is a line of output of the executed binary
```

## Table of Contents

* [Prepare & Pack](#prepare-pack)
* [Install offline](#install-offline)
* [Restore "On-line" state](#restore-on-line-state)
* [Offline registry server](#offline-registry-server)


## Prepare & Pack

Open a terminal and lets start... 

```bash
## clone this project from github
git clone https://github.com/commenthol/offline-npm.git
cd offline-npm
## install offline-npm from clone
npm install -g 
## change to folder `try`
cd ./try
## first run the project as is and install all dependencies
npm install
## run index.js
node index.js
#> semver: true
#> request: <title>DuckDuckGo</title>
## shrinkwrap the used versions
npm shrink

## ---- This would be a good point now to check-in your code into your GIT

## now prepare for offline packaging
offline-npm -a
#>     offline-npm was added to project: try
## pack all
npm pack
#> > try@0.0.0 prepublish .
#> > ./offline/offline-npm --prepublish ; 
#> 
#> npm WARN package.json try@0.0.0 No repository field.
#> npm WARN package.json try@0.0.0 No README data
#> semver@3.0.1 node_modules/semver
#> 
#> request@2.40.0 node_modules/request
#> ├── json-stringify-safe@5.0.0
#> ├── aws-sign2@0.5.0
#> ├── forever-agent@0.5.2
#> ├── oauth-sign@0.3.0
#> ├── stringstream@0.0.4
#> ├── tunnel-agent@0.4.0
#> ├── qs@1.0.2
#> ├── node-uuid@1.4.1
#> ├── mime-types@1.0.2
#> ├── tough-cookie@0.12.1 (punycode@1.3.1)
#> ├── http-signature@0.10.0 (assert-plus@0.1.2, asn1@0.1.11, ctype@0.5.2)
#> ├── hawk@1.1.1 (cryptiles@0.2.2, sntp@0.2.4, boom@0.4.2, hoek@0.9.1)
#> └── form-data@0.1.4 (mime@1.2.11, async@0.9.0, combined-stream@0.0.5)
#> try-0.0.0.tgz
```

## Install offline

You got now an archive which contains all dependencies in `offline/cache`. Now you could transfer this file to your target machine.

For now we change to folder `try-offline`. Disconnect your internet connection (e.g. plug-out Ethernet, or turn-off Wifi).

```bash
## copy the archive
cp try-0.0.0.tgz try-offline
## change folder
cd try-offline
## make a node_modules dir such to install the package herein
mkdir node_modules
## now install
npm --registry http://localhost:4873/ install try-0.0.0.tgz --verbose
#> npm WARN package.json try@0.0.0 No repository field.
#> 
#> > try@0.0.0 preinstall ./test/try/try-offline/node_modules/try
#> > ./offline/offline-npm --preinstall & sleep 2 ; 
#> 
#> Server running on port:4873 using cache in ./test/try/try-offline/node_modules/try/offline/cache/
#> 
#> > try@0.0.0 postinstall ./test/try/try-offline/node_modules/try
#> > ./offline/offline-npm --postinstall ; 
#> 
#> try@0.0.0 node_modules/try
#> ├── semver@3.0.1
#> └── request@2.40.0 (json-stringify-safe@5.0.0, forever-agent@0.5.2, aws-sign2@0.5.0, oauth-sign@0.3.0, stringstream@0.0.4, tunnel-agent@0.4.0, qs@1.0.2, node-uuid@1.4.1, mime-types@1.0.2, form-data@0.1.4, tough-cookie@0.12.1, http-signature@0.10.0, hawk@1.1.1)

## Finally execute the `index.js` within `try`
node node_modules/try/index.js 
#> semver: true
#> { [Error: connect ECONNREFUSED]
#>   code: 'ECONNREFUSED',
#>   errno: 'ECONNREFUSED',
#>   syscall: 'connect' }
```

## Restore "On-line" state

If you want to continue your development you'll need to remove the offline scripts to allow a normal "online" install.

```bash
## Back in project `try`
cd ..
## All files we used previously for offline packaging are still in the folder `offline`
find offline
#> offline/cache/...
## the `package.json` still has the offline scripts in
grep offline/ package.json 
#>    "prepublish": "./offline/offline-npm --prepublish ; ",
#>    "preinstall": "./offline/offline-npm --preinstall & sleep 2 ; ",
#>    "postinstall": "./offline/offline-npm --postinstall ; "

## remove all the "offline" stuff
offline-npm -r
#>     offline-npm was removed from project: try
## The folder `offline` is gone
find offline
#> find: `offline': No such file or directory
## check `package.json`
grep offline/ package.json
#>
```

With this a `npm install` will give you the usual install from your preferred registry.

## Offline registry server

`offline-npm` can also be used as an offline registry server. That is usefull if you want to make use of your normal npm-cache, e.g. while travelling ...

```bash
## Open in a new terminal window
## start the server using your npm cache - we use the debug mode here to see the requests
offline-npm -n -d
#> Server running on port:4873 using cache in ~/.npm

## In this terminal window - change to the `try` folder
## remove node_modules
rm -rf node_modules
## make sure that the project is not in "offline" state
offline-npm -r
## install from the npm cache using offline-npm
npm --registry http://localhost:4873/ install

## In the other terminal you should see the package requests using your offline registry server
#> [2014-08-15T08:56:33.905Z] 200 /semver semver
#> [2014-08-15T08:56:33.919Z] 200 /mocha mocha
```

Enjoy ...
