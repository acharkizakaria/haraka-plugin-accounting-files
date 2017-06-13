// node.js built-in modules
var assert   = require('assert');
var path 	 = require("path");

// npm modules
var fixtures = require('haraka-test-fixtures');

//Default config
var default_config = {
    main: {
        path: '/accounting_files',
        separator: "	",
        files_extension: "tsv",
        default_move_to_dir: "archive",
        move: 'false',
        move_interval: 86400,
        max_size: 200
    },
    location:
    {
        delivered: '/delivered',
        deferred: '/deferred',
        bounce: '/bounces'
    },
    fields:
    {
        delivered: 'type,timeLogged,timeQueued,rcpt,srcMta,srcIp,destIp,vmta,dsnStatus,dsnMsg',
        deferred:  'type,timeLogged,timeQueued,rcpt,srcMta,srcIp,destIp,vmta,dsnStatus,dsnMsg,delay',
        bounce:    'type,timeLogged,timeQueued,rcpt,srcMta,srcIp,destIp,vmta,dsnStatus,dsnMsg,bounceCat'
    }
};

beforeEach(function (done) {
    //this.outbound = new fixtures.plugin('outbound');
    this.plugin = new fixtures.plugin('index');
    this.plugin.cfg = default_config;

    this.connection = new fixtures.connection.createConnection();
    this.connection.transaction = fixtures.transaction.createTransaction();

    done();  // if a test hangs, assure you called done()
});

describe('Accounting-files plugin', function () {
    it('load', function (done) {
        assert.ok(this.plugin);
        done();
    });
});

/*var next = function () {
    test.equal(undefined, arguments[0]);
    test.done();
};*/

describe('Accounting-files config file', function () {
    it('loads "accounting_files.ini" from "config/accounting_files.ini"', function (done) {
        this.plugin.load_accounting_file_ini();

        assert.ok(this.plugin.cfg);

        done();
    });

    //TODO

});