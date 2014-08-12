# offline-npm

Hassle-free npm pack including all dependencies for offline installation with npm install

Add `offline-npm` to your project to serve a npm compatible tgz file wich contains all dependencies for offline installation with `npm install`

## Installation

    npm install -g offline-npm

## Usage

1. Open terminal and go to your project you want to prepare for offline use.
   This folder needs to contain a `package.json` file.

2. Prepare your project for offline use

        offline-npm --add

   This changes the `package.json` file and adds a `offline` folder which will contain all your dependencies.

3. Pack your project

        npm package

   Now the local cache is changed and all your projects dependencies will be downloaded into `offline/cache` and packed into the npm tgz file.
   
   __Note__: Take care not to add `*.tgz` into your `.npmignore` file!

4. Transfer the resulting `tgz` from the pack command onto a machine with no connectivity to the required registry. Execute this line from a terminal.

        npm config set registry http://localhost:4873/

   Now install the package with

        npm install [-g]

## License

Copyright (c) 2014 commenthol

Software is released under [MIT][MIT].

[MIT]: LICENSE
