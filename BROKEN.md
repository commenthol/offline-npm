## node@v4

`>> preinstall test-package` comes BEFORE `npm verb get`

````sh
npm info using npm@2.15.8
npm info using node@v4.4.7
> test-package@1.0.0 preinstall /home/comm/workspace/commenthol/offline-npm/tmp/preinst/test
> node -e "console.log('>> preinstall test-package')" ; npm run clean
>> preinstall test-package
npm info using npm@2.15.8
npm info using node@v4.4.7
> test-package@1.0.0 clean /home/comm/workspace/commenthol/offline-npm/tmp/preinst/test
> rm -rf node_modules
> test-preinst@1.0.0 preinstall /home/comm/workspace/commenthol/offline-npm/tmp/preinst/test/node_modules/test-preinst
> node index.js
npm verb addNamed ">=5.3.0 <6.0.0" is a valid semver range for semver
npm verb get saving semver to /home/comm/.npm/registry.npmjs.org/semver/.cache.json
> test-preinst@1.0.0 install /home/comm/workspace/commenthol/offline-npm/tmp/preinst/test/node_modules/test-preinst
> node -e "console.log('install test-preinst')"
> test-preinst@1.0.0 postinstall /home/comm/workspace/commenthol/offline-npm/tmp/preinst/test/node_modules/test-preinst
> node -e "console.log('postinstall test-preinst')"
> test-package@1.0.0 install /home/comm/workspace/commenthol/offline-npm/tmp/preinst/test
> node -e "console.log('>> install test-package')"
>> install test-package
> test-package@1.0.0 postinstall /home/comm/workspace/commenthol/offline-npm/tmp/preinst/test
> node -e "console.log('>> postinstall test-package')"
>> postinstall test-package
````

## node@v5

`>> preinstall test-package` comes AFTER `npm verb get https://`

--> Broken support in npm@3

````sh
comm@cu:test$ npm cache clean && npm i --verbose 2>&1 | egrep ">|get|npm info using"
npm info using npm@3.8.6
npm info using node@v5.12.0
npm verb get saving semver to /home/comm/.npm/registry.npmjs.org/semver/.cache.json
npm verb addNamed ">=5.3.0 <6.0.0" is a valid semver range for semver
npm verb get https://registry.npmjs.org/semver not expired, no request
> test-package@1.0.0 preinstall /home/comm/workspace/commenthol/offline-npm/tmp/preinst/test
> node -e "console.log('>> preinstall test-package')" ; npm run clean
>> preinstall test-package
npm info using npm@3.8.6
npm info using node@v5.12.0
> test-package@1.0.0 clean /home/comm/workspace/commenthol/offline-npm/tmp/preinst/test
> rm -rf node_modules
> test-package@1.0.0 install /home/comm/workspace/commenthol/offline-npm/tmp/preinst/test
> node -e "console.log('>> install test-package')"
>> install test-package
> test-package@1.0.0 postinstall /home/comm/workspace/commenthol/offline-npm/tmp/preinst/test
> node -e "console.log('>> postinstall test-package')"
>> postinstall test-package
````

## node@v6

`>> preinstall test-package` comes AFTER `npm verb get`

--> Broken support in npm@3

````sh
comm@cu:test$ npm cache clean && npm i --verbose 2>&1 | egrep ">|get|npm info using"
npm info using npm@3.10.3
npm info using node@v6.3.0
npm verb get saving semver to /home/comm/.npm/registry.npmjs.org/semver/.cache.json
npm verb addNamed ">=5.3.0 <6.0.0" is a valid semver range for semver
npm verb get https://registry.npmjs.org/semver not expired, no request
> test-preinst@1.0.0 preinstall /home/comm/workspace/commenthol/offline-npm/tmp/preinst/test/node_modules/.staging/test-preinst-8a4e7582
> node index.js
> test-preinst@1.0.0 install /home/comm/workspace/commenthol/offline-npm/tmp/preinst/test/node_modules/test-preinst
> node -e "console.log('install test-preinst')"
> test-preinst@1.0.0 postinstall /home/comm/workspace/commenthol/offline-npm/tmp/preinst/test/node_modules/test-preinst
> node -e "console.log('postinstall test-preinst')"
> test-package@1.0.0 preinstall /home/comm/workspace/commenthol/offline-npm/tmp/preinst/test
> node -e "console.log('>> preinstall test-package')" ; npm run clean
>> preinstall test-package
npm info using npm@3.10.3
npm info using node@v6.3.0
> test-package@1.0.0 clean /home/comm/workspace/commenthol/offline-npm/tmp/preinst/test
> rm -rf node_modules
> test-package@1.0.0 install /home/comm/workspace/commenthol/offline-npm/tmp/preinst/test
> node -e "console.log('>> install test-package')"
>> install test-package
> test-package@1.0.0 postinstall /home/comm/workspace/commenthol/offline-npm/tmp/preinst/test
> node -e "console.log('>> postinstall test-package')"
>> postinstall test-package
````
