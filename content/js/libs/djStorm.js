/**
 * Model Manager object
 * @param modelDef {Object} The model definition, i.e. fields
 */
function ModelManager(modelDef) {
	this._model = modelDef;
}

ModelManager.prototype.save = function(modelInstance, onComplete) {
	var values = [];
	var cols = []
	for (name in modelInstance._model) {
		if (name != "Meta") {
			var fieldType = modelInstance._model[name];
			var value = modelInstance[name];
			values.push(fieldType.toSql(value));
			cols.push(name);
		}
	}
	
	var tableName = modelInstance._model.Meta.dbTable;
	var primKey = modelInstance._model.Meta.primaryKey;
	
	if (modelInstance._new) {
		function insertNew() {
			db.transaction(function (tx) {
				var query = "INSERT INTO " + tableName + " (" + cols.join(",") + ") VALUES (" + values.join(",") + ")";
				tx.executeSql(query, [], function(tx, result) {
					modelInstance._new = false;
					modelInstance._old_id = modelInstance[primKey];
					onComplete(modelInstance);
				});
			});
		}
		
		db.transaction(function (tx) {
			if (!modelInstance[primKey]) {
				tx.executeSql('SELECT MAX(' + primKey + ') + 1 AS nk FROM ' + tableName, [], function(tx, result) {
					var nk = result.rows.item(0).nk;
					alert(nk);
					values[cols.indexOf(primKey)] = nk;
					modelInstance[primKey] = nk;

					insertNew();
				});
			} else {
				insertNew();
			}
		});
	} else {
		if (!modelInstance[primKey]) {
			throw "Invalid value of Primary Key '" + primKey + "'";
		}
		query = "UPDATE " + tableName + " SET ";
		var assigns = [];
		for (var i = 0; i < cols.length; ++i) {
			assigns.push(cols[i] + '=' + values[i]);
		}
		query += assigns.join(',') + " WHERE " + primKey + "=" + modelInstance._model[primKey].toSql(modelInstance._old_id);
		db.transaction(function (tx) {
			tx.executeSql(query, function(tx, result) {
				modelInstance._old_id = modelInstance[primKey];
				onComplete(modelInstance);
			});
		});
	}
}


/**
 * Meta Model object.
 * @param modelDef {Object} The model definition, i.e. fields
 */
function Model(modelDef) {

	if (!modelDef['Meta']) {
		throw "Meta information missing";
//		modelDef.Meta = {};
	}
	if (!modelDef.Meta.dbTable) {
		throw "Meta table name missing";
	}
	
	var modelManager = new ModelManager(modelDef);
	
	// create model instance constructor
	var newModel = function(values) {
		Model._completeMetaInfo(modelDef);
		
		this._model = modelDef;
		this._manager = modelManager;
		
		this._new = true;
		
		// init fields
		for (name in modelDef) {
			if (name != "Meta") {
				this[name] = null;
			}
		}
		
		// assign initial values
		for (name in values) {
			if (this[name] === null) {
				this[name] = values[name];
			} else {
				throw "Model has no field named '" + name + "'";
			}
		}
		
		// create methods
		this.save = Model._save;
		this.validate = Model._validate;
	}
	
	newModel.objects = modelManager;
	
	return newModel;
}

/**
 * Completes needed meta information about a model definition.
 */
Model._completeMetaInfo = function(modelDef) {
	// search for primary key
	for (name in modelDef) {
		if (name != "Meta") {
			if (modelDef[name]._params['primaryKey']) {
				modelDef.Meta.primaryKey = name;
				break;
			}
		}
	}
	if (!modelDef.Meta['primaryKey']) {
		modelDef.Meta.primaryKey = 'id';
		if (!modelDef[id]) {
			modelDef.id = new IntegerField({
				primaryKey: true,
			});
		}
	}
}

/**
 * Save method that every model instance has.
 * @param onComplete {Function} callback when saving is finished. It is passed the saved model instance as parameter.
 */
Model._save = function(onComplete) {
	var validationValue = this.validate();
	if (validationValue !== true) {
		throw validationValue;
	}
	
	this._manager.save(this, onComplete);
}

/**
 * Validation method that every model instance has.
 */
Model._validate = function() {
	for (name in this._model) {
		if (name != "Meta") {
			var fieldType = this._model[name];
			var value = this[name];
			var validationValue = fieldType.validate(value);
			if (validationValue !== true) {
				return validationValue;
			} else {
				this[name] = fieldType.toJs(value);
			}
		}
	}
	return true;
}


function Field(params) {
	this._params = params || {};
	if (this._params['primaryKey']) {
		this._params['unique'] = true;
		this._params['null'] = false;
	}
}

Field.prototype.toJs = function(value) {
	return value;
}

Field.prototype.toSql = function(value) {
	return "'" + value + "'";
}

Field.prototype.validate = function(value) {
	if ((value === null || value === undefined) && !this._params.null) {
		return "Value must not be " + value;
	}
	return true;
}


function CharField(params) {
	params.maxLength = params.maxLength || 255;
	Field.call(this, params);
	
}

CharField.prototype = new Field();

CharField.prototype.validate = function(value) {
	
	if (value.length > this._params.maxLength) {
		return "Value exceeds max length of " + this._params.maxLength;
	}
	return Field.prototype.validate(value);
}


function IntegerField(params) {
	Field.call(this, params);
}

IntegerField.prototype = new Field();

IntegerField.prototype.validate = function(value) {
	value = parseInt(value);
	if (isNaN(value)) {
		return "Value is not a valid integer";
	}
	if (this._params[primaryKey] && !value) {
		return true;
	}
	return Field.prototype.validate(value);
}