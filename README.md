# offline-npm

Hassle-free `npm pack` including all dependencies for offline installation with `npm install`

Add `offline-npm` to your project to serve a npm compatible tgz file wich contains all dependencies for offline installation with `npm install`.

Additionally you can use `offline-npm -n` to install packages from your local npm cache directory (Could be useful e.g. on travelling).

Even installs using `git:` or `file:` (requires node>=0.11) are considered.

## Table of Contents

<!-- !toc (minlevel=2 omit="Table of Contents") -->

* [Installation](#installation)
* [Usage](#usage)
* [Tutorial](#tutorial)
* [Install packages from npm cache offline](#install-packages-from-npm-cache-offline)
* [Troubleshooting](#troubleshooting)
* [License](#license)

<!-- toc! -->

## Installation

    npm install -g offline-npm


## Usage

1. Open terminal and go to your project you want to prepare for offline use.
   This folder needs to contain a `package.json` file.

2. Prepare your project for offline use

        offline-npm --add

   This changes the `package.json` file and adds a `offline` folder which will contain all your dependencies.

3. Pack your project

        npm pack

   Now the local cache is changed and all your projects dependencies will be downloaded into `offline/cache` and packed into the npm tgz file.

   > __Note__: Take care not to add a global `*.tgz` into your `.npmignore` file!

   > __Note__: An existing `npm-shrinkwrap.json` file will get overwritten in this step to provide install without the `--registry` switch. A backup is stored in the `./offline` folder.

4. Transfer the resulting `<name>-<version>.tgz` from the pack command onto a machine with no connectivity to the required registry. Execute this line from a terminal.

   Now install the package with:

        npm install [-g] <name>-<version>.tgz


## Tutorial

Find [here](TUTORIAL.md) a step-by-step [tutorial](TUTORIAL.md) using a provided sample project.


## Install packages from npm cache offline

If you want to use your local npm cache to install packages from use the option

    offline-npm -n [-d]

> `-d` shows you some server logs on the console.

Then install packages from the local npm cache with:

    npm --registry http://localhost:4873 [-f] install <packagename>

> Use the `-f` switch to force installing packages. This might be required if `npm` stops stating "shasum" errors.

## Troubleshooting

1. Never add `*.tgz` into your `.npmignore` file. Otherwise all `package.tgz` files for the offline installation will be missing.

   If you want to exclude previously packed versions of the package you're working with use `<name>-*.tgz` instead.

2. The script needs access to `npm`. It is assumed that `npm` is installed alongside with `node`. If you experience problems with correcty resolving `npm`, add to your `$HOME/.profile` or `$HOME/.bashrc`

        export NODE_PATH=<path_to_node_modules>/node_modules:$NODE_PATH

   where `<path_to_node_modules>` is the path to the `node_modules` dir which contains npm.

3. If installation hangs try installing in verbose mode

        `npm install <name-version>.tgz --verbose`

   If you see that some `.lock` in your files block you from progress, consider deleting them with `npm cache clean <pkg>[@<version>]`


## License

Copyright (c) 2014 commenthol

Software is released under [MIT][MIT].

[MIT]: ./LICENSE
