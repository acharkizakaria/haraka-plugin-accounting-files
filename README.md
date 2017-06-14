[![Build Status][ci-img]][ci-url]
[![GitHub license][gitHub-license-img]][gitHub-license-url]
[![NPM][npm-img]][npm-url]


ACCOUNTING FILES 
========

Gives you the ability to extract the useful information from the outbound traffic and manage the storage/archiving of the three main types 'Delivered/Deferred/Bounce'.

## Installation

To enable the plugin in you project you must add the name of the plugin "accounting_files" as a separated line inside the plugins file located inside config directory (`config/plugins`).

You should also place the config file "accounting_files.ini" inside the config directory (More details about the content of this file in the next section).

## Config File

The "accounting_files.ini" file contains several parameters that gives you the possibility to customize your plugin.

**1. Parameters of the information Log :**

* ***path:*** The path of the directory where you want to store the output files (**default:** `/accounting_files` folder inside current HARAKA installation directory). 
* ***extension:*** The extension of the files (**default:** `tsv`).
* ***separator:*** The separator of the fields inside the files (**default:** tabulation).
* ***location:*** Custom names of the three directories 'Delivered/Deferred/Bounce' inside inside the `path`.
* ***fields:*** The list of fields you want to retrieve for every type(**default:** check the list bellow).
	
The list of available `fields` :

* ***type:*** The type of the entry (`d` for delivered, `df` for deferred, `b` for bounce)
* ***timeLogged:*** Represent the time when the entry is logged to the file.
* ***timeQueued:*** Represent the time when the entry is queued.
* ***rcpt:*** The recipient (The content of `RCPT TO`).
* ***srcMta:*** The MTA name from which the message was received (Extracted from the `HELO/EHLO` command).
* ***srcIp:*** (Source IP) The local IP address used for the delivery.
* ***destIp:*** (Destination IP) The IP address where the message was delivered.
* ***jobId:*** Unique id of the mail.
* ***dsnStatus:*** DSN status for the recipient to which it refers.
* ***dsnMsg:*** DSN string message.
* ***delay:*** The delayed time before trying to resend the deferred mail (just in case of deferred mails).
* ***custom_FIELD:*** Gives you the ability of logging custom/dynamic fields (`FIELD` should be replaced by the name of the custom field you wish to log).
* ***vmta:*** The virtual MTA name (If [VMTA](https://github.com/haraka/haraka-plugin-vmta) plugin is used).

**INFO:** List of the **default** fields for every type :
* **Delivered:** type,timeLogged,timeQueued,rcpt,srcMta,srcIp,vmta,jobId,dsnStatus,dsnMsg
* **Deferred:**  type,timeLogged,timeQueued,rcpt,srcMta,srcIp,vmta,jobId,dsnStatus,dsnMsg,delay
* **Bounce:**    type,timeLogged,timeQueued,rcpt,srcMta,srcIp,vmta,jobId,dsnStatus,dsnMsg,bounceCat
    	

**2. Parameters of the `Archiving` mode :**

* ***archiving:*** Enable the archiving of the accounting files (**default:** `false`).
* ***archive_to:*** The path where to move the accounting files (**default:** `archive` folder inside every type).
* ***archive_interval:*** The time interval to move the accounting files to 'archive_to' directory (**default:** `86400` second "1 day").
* ***max_size:*** If the max size of the accounting files is reached the files will be moved to 'archive_to' directory (**default:** `200` Megabyte).

Once the `move` option is enabled in the config file the plugin will move the accounting files to `move_to` directory of all the three types in every `move_interval` or when the file length reach the `max_size`.

## Usage

Once the plugin installed you will notice the creation of the main directories based on the custom parameters passed in the config file, if the plugin shows `[INFO] [-] [accounting_files] Plugin is Ready!` in the console that mean all goes right and you could check the content of your accounting file in the `path`.

## NOTE


## TODO

[ci-img]: https://travis-ci.org/acharkizakaria/haraka-plugin-accounting-files.svg
[ci-url]: https://travis-ci.org/acharkizakaria/haraka-plugin-accounting-files
[npm-img]: https://nodei.co/npm/haraka-plugin-accounting-files.png
[npm-url]: https://www.npmjs.com/package/haraka-plugin-accounting-files
[gitHub-license-img]: https://img.shields.io/badge/license-MIT-blue.svg
[gitHub-license-url]: https://raw.githubusercontent.com/acharkizakaria/haraka-plugin-accounting-files/master/LICENSE