'use strict'

/* global describe, it */

var
  assert = require('assert'),
  semver = require('../offline-npm').semver

describe('#semver', function () {
  it('sorts an array of semver version strings in the right order', function () {
    var
      arr = [
        '0.0.1-alpha1',
        '1.15.1',
        '1.16.2',
        '1.17.0',
        '1.18.2',
        '1.17.1',
        '1.20.1',
        '1.20.1-300',
        '1.20.1-299',
        '1.20.1-305',
        '1.20.1-10',
        '20.10',
        '1.20.1-100',
        '1.20.1-1',
        '1.20.1-20',
        '1.20.1-200',
        '1.20.1-2',
        '1.21.0',
        '0.0.1-a.a.a',
        '0.0.1-a.a',
        '1.21.3',
        '1.21.3-a1',
        '1.21.3-r1',
        '1.21.4',
        '1.21.4+20001',
        '1.21.4-12',
        '1.21.4-12+2345',
        '10.21.4-alpha.1',
        '10.21.4-alpha',
        '10.21.4-beta',
        '10.21.4',
        '10.21.5-rc.1'
      ],
      exp = [
        '10.21.5-rc.1',
        '10.21.4',
        '10.21.4-beta',
        '10.21.4-alpha.1',
        '10.21.4-alpha',
        '1.21.4',
        '1.21.4+20001',
        '1.21.4-12',
        '1.21.4-12+2345',
        '1.21.3',
        '1.21.3-r1',
        '1.21.3-a1',
        '1.21.0',
        '1.20.1',
        '1.20.1-305',
        '1.20.1-300',
        '1.20.1-299',
        '1.20.1-200',
        '1.20.1-100',
        '1.20.1-20',
        '1.20.1-10',
        '1.20.1-2',
        '1.20.1-1',
        '1.18.2',
        '1.17.1',
        '1.17.0',
        '1.16.2',
        '1.15.1',
        '0.0.1-alpha1',
        '0.0.1-a.a.a',
        '0.0.1-a.a',
        '20.10'
      ]

    var res = arr.sort(semver.sort)
    // ~ console.log(res);
    assert.deepEqual(res, exp)
  })
})
