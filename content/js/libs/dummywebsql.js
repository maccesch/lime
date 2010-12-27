var WebDatabase = function(name, version, description){
	this.description = description;
}

WebDatabase.prototype.transaction = function(callback) {
	callback(new WebDatabase.Transaction());
}

WebDatabase.Transaction = function() {
}

WebDatabase.Transaction.prototype.executeSql = function(queryStr, parameters, resultsCallback, errorCallback){
}

function openDatabase(name, version, description) {
	return new WebDatabase(name, version, description);
}
