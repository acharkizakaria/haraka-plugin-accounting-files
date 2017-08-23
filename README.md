ACCOUNTING FILES 
========
[![Build Status][ci-img]][ci-url]
[![GitHub license][gitHub-license-img]][gitHub-license-url]
[![Code Climate][clim-img]][clim-url]
[![Greenkeeper badge][greenkeeper-img]][greenkeeper-url]

[![NPM][npm-img]][npm-url]

The ACCOUNTING FILES plugin gives you the ability to extract the useful/custom information from the outbound traffic and manage the 'storage/archiving' of the three main types 'Delivered/Deferred/Bounce'.

## INSTALLATION

To enable the plugin in your project you must add the name of the plugin "accounting_files" as a separated line inside the plugins file located inside config directory (`config/plugins`).

You should also place the config file "accounting_files.ini" inside the config directory (More details about the content of this file in the next section).

## CONFIG FILE

The config file "accounting_files.ini" contains several parameters that gives you the possibility to customize your plugin.

<b>1. Parameters of the `information Log` :</b>

* ***path:*** Path of the directory where you want to store the output files (**default:** `/accounting_files` folder inside current HARAKA installation directory). 
* ***extension:*** The extension of the output files (**default:** `tsv`).
* ***separator:*** The separator of the fields inside the files (**default:** tabulation).
* ***location:*** Custom names of the three directories 'Delivered/Deferred/Bounce' inside the `path`.
* ***fields:*** The list of fields you want to retrieve for every type (**default:** [Check the list below](#user-content-fields-list)).
	
	* ***type:*** The type of the entry (`d` for delivered, `df` for deferred, `b` for bounce)
	* ***timeLogged:*** Represent the time when the entry is logged to the file.
	* ***timeQueued:*** Represent the time when the entry is queued.
	* ***rcpt:*** The recipient (The content of `RCPT TO` parameter).
	* ***srcMta:*** The MTA name from which the message was received (Extracted from the `HELO/EHLO` command).
	* ***srcIp:*** (Source IP) The local IP address used for the delivery.
	* ***destIp:*** (Destination IP) The IP address where the message was delivered.
	* ***jobId:*** Unique id of the mail.
	* ***dsnStatus:*** DSN status for the recipient to which it refers.
	* ***dsnMsg:*** DSN string message.
	* ***delay:*** The delayed time before trying to resend the deferred mail (just in case of deferred mails).
	* ***bounceCat:*** Bounce Category returned from the ISP or HARAKA checks (just in case of bounced mails).
	* ***custom_FIELD:*** Gives you the ability of tracking the 'custom/dynamic' fields passed through the header (`FIELD` should be replaced by the name of the custom field you wish to log).
	* ***vmta:*** The virtual MTA name (If [VMTA plugin](https://github.com/haraka/haraka-plugin-vmta) is used).

<b id="fields-list">INFO:</b> List of the **default** fields for every type :
* **Delivered:** type,timeLogged,timeQueued,rcpt,srcMta,srcIp,vmta,jobId,dsnStatus,dsnMsg
* **Deferred:**  type,timeLogged,timeQueued,rcpt,srcMta,srcIp,vmta,jobId,dsnStatus,dsnMsg,delay
* **Bounce:**    type,timeLogged,timeQueued,rcpt,srcMta,srcIp,vmta,jobId,dsnStatus,dsnMsg,bounceCat
    	
<b>2. Parameters of the `Archiving mode` :</b>

* ***archiving:*** Enable the archiving of the accounting files (**default:** `false`).
* ***archive_to:*** Name of the directory where to move the accounting files (**default:** `archive` folder inside every type).
* ***archive_interval:*** The time interval to move the accounting files to 'archive_to' directory (**default:** `86400` second "1 day").
* ***max_size:*** If the max size of the accounting files is reached the files will be moved to 'archive_to' directory (**default:** `200` Megabyte).

## INITIALIZATION

Once installed, the plugin will wait for the start of HARAKA server to be initialized, by reading the config file and checking if the necessary _directories_ are already exist.

There's two cases, if the plugin was already enabled it will create just the _files_ at the start, if it's enabled for the first time, it will setUp the environment by triggering the generation of the all necessary [_directories_](#user-content-directories) and [_files_](#user-content-files).
 
<b id="directories">1. Directories generation:</b>

The first generated directory is the main one that will contain all the plugin content, this directory will be created based on the value of the passed parameter `path`. Inside the previous generated directory the plugin will create a separated directory for every type of the three tracked types 'Delivered/Deferred/Bounce' (The name of these directories will be retrieved from the config parameter `location`).

If the [**Archiving mode**](#user-content-archiving-mode) is enabled, the plugin will add an extra directory for the archiving purpose inside the directory of every type (The name of the directories will be the value of config parameter `archive_to`).

<b id="files">2. Files generation:</b>

The plugin will generate three separated main files (one file for every type) where the retrieved custom information from the outbound traffics will be stored, every file of them will be located inside the main directory (created previously) of the related type.
 
The name of the file start by the type 'd/dl/b' followed by the full datetime in the following format (`yyyy-mm-dd-HHMMss`) and finally the extension, e.g :
  
    d.2017-06-16-125059.tsv
    ^ ^^^^^^^^^^^^^^^^^ ^^^
    | |                 |__ Extenstion of the file (retrieved from the config file)  
    | |____________________ Current datetime in `yyyy-mm-dd-HHMMss` format
    |______________________ Type of the file (d:delivered, df:deferred, b:bounce)
          
Every new file has a header that contain the custom fields passed in the config parameter `fields`, those fields are separated by the separator indicated in the config file `separator`.

## HOW IT WORKS

After the initialization the plugin hook the three principal hooks who follows the `send_email` :

  - hook_delivered  (once per delivery domain with at least one successful recipient)
  - hook_deferred  (once per delivery domain where at least one recipient or connection was deferred)
  - hook_bounce  (once per delivery domain where the recipient(s) or message was rejected by the destination)

When the outbound trigger any hook of the three then the plugin will retrieve the necessary `fields` based on the received arguments from every hook to construct the entry of the current mail and finally append it to the related file.

<h4 id="archiving-mode">Archiving mode :</h4>

When this option is enabled in the config file by setting `archiving` parameter to _true_, the plugin will move all the accounting files to `move_to` directory of the three types, using two factors `time` and `size` :

 - **Time** represented by the `move_interval` parameter.
 - **Size** represented by the `max_size` parameter.
 
 The plugin will move the files to archive every _X second_ specified in `move_interval` _OR_ when the file length reach the `max_size`.
 
## NOTES

 - The config file it self is required for the plugin, but there's no required parameter since all the parameters has a default value (what mean you can leave it blank).
 
 - The plugin will log `[INFO] [-] [accounting_files] Plugin is Ready!` in the console when all the _directories_ and _files_ are well generated what mean all goes right.

## TODO

 - Customize the name of the output files from config file. 
 - Write the necessary tests.

[ci-img]: https://travis-ci.org/acharkizakaria/haraka-plugin-accounting-files.svg
[ci-url]: https://travis-ci.org/acharkizakaria/haraka-plugin-accounting-files
[npm-img]: https://nodei.co/npm/haraka-plugin-accounting-files.png
[npm-url]: https://www.npmjs.com/package/haraka-plugin-accounting-files
[gitHub-license-img]: https://img.shields.io/badge/license-MIT-blue.svg
[gitHub-license-url]: https://raw.githubusercontent.com/acharkizakaria/haraka-plugin-accounting-files/master/LICENSE
[clim-img]: https://codeclimate.com/github/acharkizakaria/haraka-plugin-accounting-files/badges/gpa.svg
[clim-url]: https://codeclimate.com/github/acharkizakaria/haraka-plugin-accounting-files
[greenkeeper-img]: https://badges.greenkeeper.io/acharkizakaria/haraka-plugin-accounting-files.svg
[greenkeeper-url]: https://greenkeeper.io/
