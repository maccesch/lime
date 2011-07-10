/**
 * Author: Maccesch Cassola
 * EMail: maccesch@gmail.com
 * Date: 2010-07-27
 *
 * This is a wrapper for the Mozilla SQLite Storage Service because
 * Mozilla doesn't support HTML5 Web SQL Databases. Please note that
 * The Mozilla Storage isn't available to WebApps. But it is for XULRunner
 * Apps for example.
 *
 * Requires Gecko >= 1.9.1
 *
 * You have to create at least one table in your database for this to work.
 * This means you have to provide an inital default database for your app.
 *
 * License:
 * Use this however you like :-)
 *
 * Example use:
 *
 *	var db = openDatabase("test", "1.0", "blabla");
 *	db.transaction(function(tx) {
 *	
 *		tx.executeSql('SELECT ? FROM ?', ['name', 'Kuh'], function(tx, results) {
 *			window.setTimeout(function() {
 *				window.alert(results.rows.item(0).name);
 *			}, 300);
 *	
 *		});
 *	});
 */
 
 
/*
 * The database wrapper class
 */
var WebDatabase = function(name, version, description) {
	this.description = description;
	
	var file = Components.classes["@mozilla.org/file/directory_service;1"]  
						 .getService(Components.interfaces.nsIProperties)  
						 .get("ProfD", Components.interfaces.nsIFile);  
	file.append(name + ".sqlite");
	
	var storageService = Components.classes["@mozilla.org/storage/service;1"]  
                        .getService(Components.interfaces.mozIStorageService);  
    
	this.dbCon = storageService.openUnsharedDatabase(file);
	if (!this.dbCon) {
		throw "Couldn't connect to database.";
	}
}

/*
 * HTML5 Web SQL Database transaction method.
 * Parameter callback: function (tx) { ... }
 */
WebDatabase.prototype.transaction = function(callback) {
	callback(new WebDatabase.Transaction(this.dbCon));
}


/*
 * HTML5 Web SQL Database transaction object that is passed to
 * the callback of the database transaction method.
 */
WebDatabase.Transaction = function(dbCon) {
	this.dbCon = dbCon;
}

/*
 * HTML5 Web SQL Database transaction.executeSql method.
 */
WebDatabase.Transaction.prototype.executeSql = function(queryStr, parameters, resultsCallback, errorCallback) {
	if (parameters) {
		var resultStr = "";
		var parameterIndex = 0;
		for (var i = 0; i < queryStr.length; ++i) {
			if (queryStr[i] == '?') {
				var value = parameters[parameterIndex++];
				if (value.charCodeAt) {
					value = '"' + value + '"';
				}
				resultStr += value;
			} else {
				resultStr += queryStr[i];
			}
		}
		queryStr = resultStr;
	}

	dump(queryStr + "\n");
	try {
		var statement = this.dbCon.createStatement(queryStr);
	} catch (e) {
		throw this.dbCon.lastErrorString + ":\n" + queryStr + "\n";
	}

	var self = this;
	var results = {
		rows: {
			item: function(i) { return this._items[i]; },
			_items: [],
			length: 0,
		}
	};
	statement.executeAsync({
		handleResult: function(resultSet) {
			self.processResults(resultSet, statement, results);
		},
		
		handleError: function(error) {
			errorCallback(self, error);
			if (console) {
				console.error(error.message);
			}
		},
		
		handleCompletion: function(reason) {
			if (reason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
				throw "Query canceled or aborted!";
			}
			if (resultsCallback) {
				resultsCallback(self, results);
			}
			
		}
	});
}

WebDatabase.Transaction.prototype.processResults = function(resultSet, statement, results) {
	for (var row = resultSet.getNextRow(); row; row = resultSet.getNextRow()) {
		var resultRow = {};
		
		for (var i = 0; i < statement.columnCount; ++i) {
			resultRow[statement.getColumnName(i)] = row.getResultByIndex(i);
		}
		results.rows._items.push(resultRow);
		++(results.rows.length);
	}
}

/*
 * HTML5 Web SQL Database creation function.
 */
function openDatabase(name, version, description) {
	return new WebDatabase(name, version, description);
}
