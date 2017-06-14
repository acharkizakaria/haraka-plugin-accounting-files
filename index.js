// accounting_files
//------------
// documentation via: `haraka -h accounting_files`

//var outbound 	= require("./outbound");
var fs   		= require("fs");
var path 		= require("path");
var dateFormat 	= require('dateformat');
var cfg;

exports.register = function () {
    var plugin = this;

    plugin.load_accounting_file_ini();

    plugin.register_hook('init_master', 	'init_plugin');
    plugin.register_hook('init_child',  	'init_plugin');

    plugin.register_hook('queue_outbound', 	'set_header_to_note');
    plugin.register_hook('delivered',   	'delivered');
    plugin.register_hook('deferred',   	 	'deferred');
    plugin.register_hook('bounce',   		'bounce');
};

//-------------------------------------------------------------------------------------------------------------------
//Plugin Hooks ------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------------

//Init plugin
exports.init_plugin = function (next)  {
    var context             = this;
    var acct_path           = cfg.main.path || path.join(process.env.HARAKA, "accounting_files");
    var separator           = cfg.main.separator || "	";
    var files_extension     = cfg.main.extension || "tsv";
    var move_interval_val   = cfg.main.move_interval || 86400;
    var default_move_to_dir = "archive";
    var max_size            = cfg.main.max_size || 200;

    //Setting global variables to notes
    server.notes.acct_path          = acct_path;
    server.notes.separator          = separator;
    server.notes.files_extension 	= files_extension;
    server.notes.max_size           = max_size;

    //Accounting files directories
    if ( cfg.hasOwnProperty("location") ) {
        server.notes.delivered_dir_path = path.join(acct_path, ( cfg.location.delivered || "delivered" ));
        server.notes.deferred_dir_path 	= path.join(acct_path, ( cfg.location.deferred || "deferred" ));
        server.notes.bounce_dir_path 	= path.join(acct_path, ( cfg.location.bounce || "bounce" ));
    } else {
        server.notes.delivered_dir_path	= path.join(acct_path, "delivered");
        server.notes.deferred_dir_path 	= path.join(acct_path, "deferred");
        server.notes.bounce_dir_path 	= path.join(acct_path, "bounce");
    }

    //Accounting files fields
    if ( cfg.hasOwnProperty("fields") ) {
        server.notes.delivered_fields	= ( cfg.fields.delivered || "type,timeLogged,timeQueued,rcpt,srcMta,srcIp,vmta,jobId,dsnStatus,dsnMsg" ).split(",");
        server.notes.deferred_fields	= ( cfg.fields.deferred || "type,timeLogged,timeQueued,rcpt,srcMta,srcIp,vmta,jobId,dsnStatus,dsnMsg,delay" ).split(",");
        server.notes.bounce_fields		= ( cfg.fields.bounce || "type,timeLogged,timeQueued,rcpt,srcMta,srcIp,vmta,jobId,dsnStatus,dsnMsg,bounceCat" ).split(",");
    } else {
        server.notes.delivered_fields	= ["type","timeLogged","timeQueued","rcpt","srcMta","srcIp","vmta","jobId","dsnStatus","dsnMsg"];
        server.notes.deferred_fields	= ["type","timeLogged","timeQueued","rcpt","srcMta","srcIp","vmta","jobId","dsnStatus","dsnMsg","delay"];
        server.notes.bounce_fields		= ["type","timeLogged","timeQueued","rcpt","srcMta","srcIp","vmta","jobId","dsnStatus","dsnMsg","bounceCat"];
    }

    //-------------------------------------------------------------------------------------------------------
    //Init plugin directories
    createDirectoryIfNotExist(acct_path); 						//Create main directory
    createDirectoryIfNotExist(server.notes.delivered_dir_path); //Create delivered directory
    createDirectoryIfNotExist(server.notes.deferred_dir_path); 	//Create deferred directory
    createDirectoryIfNotExist(server.notes.bounce_dir_path); 	//Create bounce directory

    //Init plugin files with the header fields
    GenerateNewFile('delivered');
    GenerateNewFile('deferred');
    GenerateNewFile('bounce');

    //-------------------------------------------------------------------------------------------------------

    //Accounting files "move_to" directories if "move" option is enabled
    if ( cfg.main.hasOwnProperty("move") ) {
        if ( cfg.main.move === "true") {
            var delivered_move_to_dir_name	= default_move_to_dir;
            var deferred_move_to_dir_name 	= default_move_to_dir;
            var bounce_move_to_dir_name 	= default_move_to_dir;

            if ( cfg.hasOwnProperty("move_to") ) {
                delivered_move_to_dir_name	= cfg.move_to.delivered || default_move_to_dir;
                deferred_move_to_dir_name 	= cfg.move_to.deferred || default_move_to_dir;
                bounce_move_to_dir_name 	= cfg.move_to.bounce || default_move_to_dir;
            }
        }

        server.notes.delivered_move_to_dir_path	= path.join( server.notes.delivered_dir_path, delivered_move_to_dir_name);
        server.notes.deferred_move_to_dir_path 	= path.join( server.notes.deferred_dir_path, deferred_move_to_dir_name);
        server.notes.bounce_move_to_dir_path  	= path.join( server.notes.bounce_dir_path, bounce_move_to_dir_name);

        if ( cfg.main.move === "true") {
            //Init plugin 'move' directories
            createDirectoryIfNotExist( server.notes.delivered_move_to_dir_path );	//Create delivered move to directory
            createDirectoryIfNotExist( server.notes.deferred_move_to_dir_path );	//Create deferred move to directory
            createDirectoryIfNotExist( server.notes.bounce_move_to_dir_path );		//Create bounce move to directory

            //Set move interval if "move_to" is specified in config files
            server.notes.move_interval = setInterval( function () {
                moveDirFiles( server.notes.delivered_dir_path, server.notes.delivered_move_to_dir_path, [delivered_move_to_dir_name], context); 	//Move delivered files
                moveDirFiles( server.notes.deferred_dir_path, server.notes.deferred_move_to_dir_path, [deferred_move_to_dir_name], context); 		//Move deferred files
                moveDirFiles( server.notes.bounce_dir_path, server.notes.bounce_move_to_dir_path, [bounce_move_to_dir_name], context); 				//Move bounce files
            }, move_interval_val * 1000 );
        }
    }

    context.loginfo("Plugin is Ready!");

    return next();
};

exports.set_header_to_note = function (next, connection) {
    //Setting the header to notes before sent, we will need it in 'delivered/bounce/deferred' hooks to get "custom_FIELD" parameters
    connection.transaction.notes.header = connection.transaction.header;

    return next();
};

exports.delivered = function (next, hmail, params) {
    var plugin    = this;
    var todo      = hmail.todo;
    var header    = hmail.notes.header;
    var rcpt_to   = todo.rcpt_to[0];

    if (!todo) return next();

    var fields_values = {};

    server.notes.delivered_fields.forEach ( function (field) {

        plugin.loginfo(field);

        switch (field) {
            case "type" :
                fields_values.type = "d";
                break;
            case "timeLogged" :
                fields_values.timeLogged = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
                break;
            case "timeQueued" :
                fields_values.timeQueued = dateFormat(new Date(todo.queue_time), "yyyy-mm-dd HH:MM:ss");
                break;
            case "rcpt" :
                fields_values.rcpt = rcpt_to.original.slice(1, -1);
                break;
            case "srcType" :
                fields_values.srcType = "smtp";
                break;
            case "srcMta" :
                fields_values.srcMta = todo.notes.outbound_helo;
                break;
            case "dlvSourceIp" :
                fields_values.dlvSourceIp = todo.notes.outbound_ip;
                break;
            case "dlvDestinationIp" :
                fields_values.dlvDestinationIp = params[1] || " - ";
                break;
            case "vmta" :
                fields_values.vmta = server.notes.vmta || " - ";
                break;
            case "jobId" :
                fields_values.jobId = todo.uuid;
                break;
            case (field.match(/^custom_/) || {}).input :
                fields_values[field] = header.get(field) || " - ";
                break;
            case "dsnStatus" :
                fields_values.dsnStatus = " - ";
                break;
            case "dsnDiag" :
                fields_values.dsnDiag = " - ";
                break;
            case "delay" :
                fields_values.delay = " - ";
                break;
        }
    });

    addRecord(server.notes.delivered_file_path, server.notes.delivered_fields, fields_values, 'delivered', this);

    plugin.loginfo("Delivered Record Added.");

    return next();
};

exports.deferred = function (next, hmail, params) {
    var plugin   = this;
    var todo     = hmail.todo;
    var header   = hmail.notes.header;
    var rcpt_to  = todo.rcpt_to[0];

    if (!todo) return next();

    var fields_values = {};

    server.notes.deferred_fields.forEach ( function (field) {
        switch (field) {
            case "type" :
                fields_values.type = "df";
                break;
            case "timeLogged" :
                fields_values.timeLogged = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
                break;
            case "timeQueued" :
                fields_values.timeQueued = dateFormat(new Date(todo.queue_time), "yyyy-mm-dd HH:MM:ss");
                break;
            case "rcpt" :
                fields_values.rcpt = rcpt_to.original.slice(1, -1);
                break;
            case "srcType" :
                fields_values.srcType = "smtp";
                break;
            case "srcMta" :
                fields_values.srcMta = todo.notes.outbound_helo;
                break;
            case "dlvSourceIp" :
                fields_values.dlvSourceIp = todo.notes.outbound_ip;
                break;
            case "dlvDestinationIp" :
                fields_values.dlvDestinationIp = " - ";
                break;
            case "vmta" :
                fields_values.vmta = server.notes.vmta || " - ";
                break;
            case "jobId" :
                fields_values.jobId = todo.uuid;
                break;
            case (field.match(/^custom_/) || {}).input :
                fields_values[field] = header.get(field) || " - ";
                break;
            case "dsnStatus" :
                fields_values.dsnStatus = rcpt_to.dsn_code || rcpt_to.dsn_status;
                break;
            case "dsnDiag" :
                fields_values.dsnDiag = rcpt_to.dsn_smtp_response;
                break;
            case "bounceCat" :
                fields_values.bounceCat = " - ";
                break;
            case "delay" :
                fields_values.delay = params.delay;
                break;
        }
    });

    addRecord(server.notes.deferred_file_path, server.notes.deferred_fields, fields_values, 'deferred', this);

    plugin.loginfo("Deferred Record Added.");

    return next();
};

exports.bounce  = function (next, hmail, error) {
    var plugin  = this;
    var todo    = hmail.todo;
    var header  = hmail.notes.header;
    var rcpt_to = todo.rcpt_to[0];

    if (!todo) return next();

    var fields_values = {};

    server.notes.bounce_fields.forEach ( function (field) {
        switch (field) {
            case "type" :
                fields_values.type = "b";
                break;
            case "timeLogged" :
                fields_values.timeLogged = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
                break;
            case "timeQueued" :
                fields_values.timeQueued = dateFormat(new Date(todo.queue_time), "yyyy-mm-dd HH:MM:ss");
                break;
            case "rcpt" :
                fields_values.rcpt = rcpt_to.original.slice(1, -1);
                break;
            case "srcType" :
                fields_values.srcType = "smtp";
                break;
            case "srcMta" :
                fields_values.srcMta = todo.notes.outbound_helo;
                break;
            case "dlvSourceIp" :
                fields_values.dlvSourceIp = todo.notes.outbound_ip;
                break;
            case "dlvDestinationIp" :
                fields_values.dlvDestinationIp = "dlvDestinationIp";
                break;
            case "vmta" :
                fields_values.vmta = server.notes.vmta || " - ";
                break;
            case "jobId" :
                fields_values.jobId = todo.uuid;
                break;
            case (field.match(/^custom_/) || {}).input :
                fields_values[field] = header.get(field) || " - ";
                break;
            case "dsnStatus" :
                fields_values.dsnStatus = rcpt_to.dsn_code || rcpt_to.dsn_status;
                break;
            case "dsnDiag" :
                if ( rcpt_to.hasOwnProperty("dsn_code"))
                    fields_values.dsnDiag = rcpt_to.reason || (rcpt_to.dsn_code + " " + rcpt_to.dsn_msg);
                else if ( rcpt_to.hasOwnProperty("dsn_smtp_code"))
                    fields_values.dsnDiag = rcpt_to.dsn_smtp_code + " " + rcpt_to.dsn_status + " " + rcpt_to.dsn_smtp_response;
                else
                    fields_values.dsnDiag = " - ";

                break;
            case "bounceCat" :
                fields_values.bounceCat = rcpt_to.reason || (rcpt_to.dsn_code + " (" + rcpt_to.dsn_msg + ")");
                break;
            case "delay" :
                fields_values.delay = " - ";
                break;
        }
    });

    addRecord(server.notes.bounce_file_path, server.notes.bounce_fields, fields_values, 'bounce', this);

    plugin.loginfo("Bounce Record Added.");

    //Prevent the sending of bounce mail to originating sender
    return next(OK);
};

exports.shutdown  = function () {
    //clear the "move_interval" interval if "move_to" is specified in the config files
    if ( cfg.main.hasOwnProperty("move") ) {
        if ( cfg.main.move === "true") {
            clearInterval(server.notes.move_interval);
        }
    }
};

//-------------------------------------------------------------------------------------------------------------------
//Plugin Functions --------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------------

//Load configuration file
exports.load_accounting_file_ini = function () {
    var plugin = this;

    plugin.loginfo("Accounting_file configs are fully loaded from 'accounting_files.ini'.");
    cfg = plugin.config.get("accounting_files.ini", function () {
        plugin.register();
    });
    plugin.loginfo(cfg);
};

//Generate new files for the 3 types 'delivered/deferred/bounce'
var GenerateNewFile = function (type){
    if ( type == 'delivered' ){
        //Set new paths to the notes
        server.notes.delivered_file_path = path.join( server.notes.delivered_dir_path, "d." + dateFormat(new Date(), "yyyy-mm-dd-HHMMss") + "." + server.notes.files_extension);
        createFileIfNotExist(server.notes.delivered_file_path, server.notes.delivered_fields); 	//Create delivered file

        //Return new files names
        return path.basename(server.notes.delivered_file_path);
    }
    else if ( type == 'deferred' ){
        //Set new paths to the notes
        server.notes.deferred_file_path = path.join( server.notes.deferred_dir_path, "t." + dateFormat(new Date(), "yyyy-mm-dd-HHMMss") + "." + server.notes.files_extension);
        createFileIfNotExist(server.notes.deferred_file_path, server.notes.deferred_fields);	//Create deferred file

        //Return new files names
        return path.basename(server.notes.deferred_file_path);
    }
    else if ( type == 'bounce' ){
        //Set new paths to the notes
        server.notes.bounce_file_path = path.join( server.notes.bounce_dir_path, "b." + dateFormat(new Date(), "yyyy-mm-dd-HHMMss") + "." + server.notes.files_extension);
        createFileIfNotExist(server.notes.bounce_file_path, server.notes.bounce_fields);		//Create bounce file

        //Return new files names
        return path.basename(server.notes.bounce_file_path);
    }
};

//Create directory if not exist
var createDirectoryIfNotExist = function (dir_name) {
    if ( !fs.existsSync(dir_name) ) {
        fs.mkdirSync(dir_name);
    }
};

//Create file if not exist and add the file header from the passed fields
var createFileIfNotExist = function (filename, fields) {
    if ( !fs.existsSync(filename) ) {
        fs.writeFileSync(filename);

        //Set file header from the pre-defined fields
        setHeaderFromFields(filename, fields);
    }
};

//Set Header to file from fields
var setHeaderFromFields = function (filename, fields) {
    var headers = "";

    fields.forEach ( function (field) {
        headers += field + server.notes.separator;
    });

    fs.writeFileSync(filename, headers + "\r\n");
};

//Add new record to the passed accounting file in parameters
var addRecord = function (filename, fields, fields_values, type, context) {
    var separator 	= server.notes.separator;
    var record 		= "";

    fields.forEach  ( function (field) {
        record += fields_values[field] + separator;
    });

    fs.appendFileSync(filename, record + "\r\n");

    checkSizeAndMove(filename, type, context);
};

//Move all the content of 'from_dir' directory to 'to_dir' directory except the 'files/directories' passed in the 'except' array
var moveDirFiles = function (from_dir, to_dir, except, context) {
    //Generate new files and switch to them before the move so the logging ofthe data will not stop
    var new_files = [];

    new_files.push( GenerateNewFile('delivered', context) );
    new_files.push( GenerateNewFile('deferred', context) );
    new_files.push( GenerateNewFile('bounce', context) );

    //Add new files names 'except' array to exclude them from the move
    except = except.concat(new_files);

    //Move content
    fs.readdir(from_dir, function (err, files) {
        files.forEach ( function (filename) {
            if (except.indexOf(filename) == -1) {
                fs.rename(from_dir + "/" + filename, to_dir + "/" + filename, function (_err) {
                    if (_err) {
                        context.loginfo("Can't move file '" + filename + "' " + _err);
                        throw _err;
                    } else {
                        context.loginfo("File '" + filename + "' moved");
                    }
                });
            }
        });
    });
};

//Get the size of the passed filename in megabyte
var getFileSizeInMegabyte = function ( filename ) {
    const stats = fs.statSync(filename);
    const fileSizeInBytes = stats.size;
    return fileSizeInBytes / 1000000.0;
};

//Check the size of the file if it's greater or equals to 'max_size' archive the file to the related directory and generate a new file
var checkSizeAndMove = function ( filename, type, context ) {
    var file_size	 = getFileSizeInMegabyte(filename);

    if ( file_size >= server.notes.max_size ) {
        var move_to_path = '';
        var file_base_name = path.basename(filename);

        if ( type == 'delivered' )
            move_to_path = server.notes.delivered_move_to_dir_path;
        else if ( type == 'deferred' )
            move_to_path = server.notes.deferred_move_to_dir_path;
        else if ( type == 'bounce' )
            move_to_path = server.notes.bounce_move_to_dir_path;

        //Generate and switch to new file that will replace the moved one
        GenerateNewFile(type, context);

        fs.rename(filename, move_to_path + "/" + file_base_name, function (err) {
            if (err) {
                context.loginfo("Can't move file '" + file_base_name + "' " + err);
                throw err;
            } else {
                context.loginfo("File '" + file_base_name + "' moved");
            }
        });
    }
};
