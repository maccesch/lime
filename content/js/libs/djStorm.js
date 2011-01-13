/**
 * Model Manager object
 * @param modelDef {Object} The model definition, i.e. fields
 */
function ModelManager(modelDef) {
	QuerySet.call(this, modelDef);
}

ModelManager.prototype = new QuerySet();

/**
 * Saves a model instance to the db.
 * @param modelInstance The model instance to save
 * @param onComplete {Function} callback function that is called when instance has been saved. Takes the saved instance as parameter.
 */
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
		this._saveNew(tableName, primKey, modelInstance, cols, values, onComplete);
	} else {
		this._saveExisting(tableName, primKey, modelInstance, cols, values, onComplete);
	}
}

/**
 * Saves an existing (already in db) model instance to the db.
 */
ModelManager.prototype._saveExisting = function(tableName, primKey, modelInstance, cols, values, onComplete) {
	if (!modelInstance[primKey]) {
		throw "Invalid value of Primary Key '" + primKey + "'";
	}
	var query = "UPDATE " + tableName + " SET ";
	var assigns = [];
	for (var i = 0; i < cols.length; ++i) {
		assigns.push(cols[i] + '=' + values[i]);
	}
	query += assigns.join(',') + " WHERE " + primKey + "=" + modelInstance._model[primKey].toSql(modelInstance._old_id);
	db.transaction(function (tx) {
		tx.executeSql(query, [], function(tx, result) {
			modelInstance._old_id = modelInstance[primKey];
			onComplete(modelInstance);
		});
	});
}

/**
 * Saves a new (not in db yet) model instance to the db.
 */
ModelManager.prototype._saveNew = function(tableName, primKey, modelInstance, cols, values, onComplete) {
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
}

/**
 * Class that represents a list of model instances that are retrieved by a database query.
 */
function QuerySet(modelDef) {
	this._model = modelDef;
	
	this._where = "";
	this._extra = "";
	
	// TODO : implement caching
	this._cache = null;
}

/**
 * Creates a deep copy of this object.
 */
QuerySet.prototype.clone = function() {
	var newQs = new QuerySet(this._model);
	
	newQs._where = this._where;
	newQs._extra = this._extra;
	
	return newQs;
}

/**
 * Extracts model instances from result rows of a database query.
 */
QuerySet.prototype._extractModelInstances = function(rows, modelDef) {
	var len = rows.length;

	var instances = [];
	for (var i = 0; i < len; ++i) {
		var item = rows.item(i);
		var instance = {};
		Model._initInstance.call(instance, modelDef, this, item);
		instances.push(instance);
	}
	return instances;
}

/**
 * Builds the where clause of the sql query, that fetches all instances that are represented by this queryset
 */
QuerySet.prototype._buildWhere = function() {
	if (this._where.length > 0) {
		return " WHERE " + this._where;
	}
	return "";
}

/**
 * Builds the extra clauses (like GROUP BY or ORDER BY) of the sql query, that fetches all instances that are represented by this queryset
 */
QuerySet.prototype._buildExtra = function() {
	if (this._extra.length > 0) {
		return " " + this._extra;
	}
	return "";
}

/**
 * Fetches all instances of the model which are in the db. This method
 * actually hits the database and evaluates the query set.
 * @param onComplete Callback that is called with a list of all instances.
 */
QuerySet.prototype.all = function(onComplete) {
	var self = this;
	db.transaction(function (tx) {
		tx.executeSql("SELECT * FROM " + self._model.Meta.dbTable + self._buildWhere() + self._buildExtra(), [], function(tx, result) {
			var instances = self._extractModelInstances(result.rows, self._model);
			onComplete(instances);
		});
	});
}

// TODO : foreign keys

/**
 * Returns a QuerySet which represents all instances of the model which validate against queryObj. This QuerySet remains unchanged.
 * @param queryObj field lookups or Q object.
 */
QuerySet.prototype.filter = function(queryObj) {
	var values = [];
	var whereStr;
	if (queryObj instanceof Q.Obj) {
		values = queryObj._values;
		whereStr = queryObj._where;
	} else {
		whereStr = this.convertLookups(queryObj, values);
	}
	whereStr = this._bindParameters(whereStr, values);
	
	var newQs = this.clone();
	if (newQs._where.length > 0) {
		newQs._where = "(" + newQs._where + ") AND ";
	}
	newQs._where += "(" + whereStr + ")"
	return newQs;
}

/**
 * Returns a QuerySet which represents all instances of the model which do NOT validate against queryObj. This QuerySet remains unchanged.
 * @param queryObj field lookups or Q object.
 */
QuerySet.prototype.exclude = function(queryObj) {
	var newQs = this.filter(queryObj);
	newQs._where = "NOT " + newQs._where;
	return newQs;
}

/**
 * Returns a new QuerySet that is ordered by the given fields.
 * @example Entry.objects.orderBy('-pub_date', 'headline').all(...);
 */
QuerySet.prototype.orderBy = function() {
	var orderList = [];
	for (var i = 0; i < arguments.length; ++i) {
		var a = arguments[i];
		if (a[0] == "-") {
			orderList.push(a.substr(1) + " DESC");
		} else {
			orderList.push(a + " ASC");
		}
	}
	
	var newQs = this.clone();
	newQs._extra += " ORDER BY " + orderList.join(',');
	newQs._extra = newQs._extra.trim();
	return newQs;
}

/**
 * Converts a lookup object into an SQL WHERE condition.
 */
QuerySet.prototype.convertLookups = function(queryObj, values) {
	var wheres = [];
	for (lookup in queryObj) {
		var lus = lookup.split("__");
		var col = lus[0];
		var op = lus.length > 1 ? lus[1] : 'exact';
		
		var val = queryObj[lookup];
		values.push(val);
		
		wheres.push(this._buildCondition(col, op));
	}
	return "(" + wheres.join(") AND (") + ")";
}

/**
 * Builds a part of the sql where condition based on the columns, the lookup operation and the value.
 */
QuerySet.prototype._buildCondition = function(col, op) {
	
	var placeholder = "${" + col + '}';
	
	if (op == 'exact') {
		return col + " = " + placeholder + " COLLATE BINARY";
	} else if (op == 'iexact') {
		return col + " = " + placeholder + " COLLATE NOCASE";
	} else if (op == 'contains') {
		return col + " LIKE '%" + placeholder + "%'";
	} else if (op == 'icontains') {
		// TODO : sqlite doesn't support ILIKE
		return col + " LIKE '%" + placeholder + "%'";
	} else if (op == 'in') {
		return col + " IN (" + placeholder + ")";
	} else if (op = 'gt') {
		return col + ">" + placeholder;
	} else if (op = 'gte') {
		return col + ">=" + placeholder;
	} else if (op = 'lt') {
		return col + "<" + placeholder;
	} else if (op = 'lte') {
		return col + "<=" + placeholder;
	}
}

QuerySet.prototype._bindParameters = function(whereStr, values) {
	
	var i = 0;
	var index = whereStr.indexOf('${');
	while (index >= 0) {
		var col = whereStr.substr(index + 2).split('}', 1)[0];
		var val = values[i++];

		if (!this._model[col]) {
			throw "Model does not have a field named '" + col + "'";
		}

		// format val for sql
		if (val instanceof Array) {
			for (var i = 0; i < val.length; ++i) {
				val[i] = this._model[col].toSql(val[i]);
			}
			val = val.join(',');
		} else {
			val = this._model[col].toSql(val);
		}
		
		whereStr = whereStr.substring(0, index) + val + whereStr.substr(index + col.length + 3);
		
		var index = whereStr.indexOf('${', index + 1);
	}
	
	// remove additional quotes of LIKE clauses
	whereStr = whereStr.replace(/'%'(.*?)'%'/g, "'%$1%'");
	
	return whereStr;
}


/**
 * Creates a lookup object. Used for complex lookups in QuerySet.filter() for example.
 * @queryObj lookups like in QuerySet.filter()
 * @example
 * Book.objects.filter(Q({ title__exact: "Hello" }).or(Q({ author__exact: "John Doe" })))
 */
function Q(queryObj) {
	var values = [];
	
	var whereStr = QuerySet.prototype.convertLookups(queryObj, values);
	
	return new Q.Obj(whereStr, values);
}

/**
 * The actual lookup object
 */
Q.Obj = function(whereStr, values) {
	this._where = whereStr;
	this._values = values;
}

/**
 * Returns a lookup object that represents the AND composition.
 */
Q.Obj.prototype.and = function(rhs) {
	return new Q.Obj("(" + this._where + ") AND (" + rhs._where + ")",
			this._values.concat(rhs._values));
}

/**
 * Returns a lookup object that represents the OR composition.
 */
Q.Obj.prototype.or = function(rhs) {
	return new Q.Obj("(" + this._where + ") OR (" + rhs._where + ")",
			this._values.concat(rhs._values));
}

/**
 * Returns the negated op.
 */
Q.not = function(op) {
	return new Q.Obj("NOT (" + op._where + ')', op._values);
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
	Model._completeMetaInfo(modelDef);
	
	var modelManager = new ModelManager(modelDef);
	
	// create model instance constructor
	var newModel = function(values) {
		this._new = true;
		
		Model._initInstance.call(this, modelDef, modelManager, values);
	}
	
	newModel.objects = modelManager;
	newModel.getScheme = Model._getScheme;
	
	return newModel;
}

/**
 * Initializes a new model instance.
 */
Model._initInstance = function(modelDef, modelManager, values) {
	this._model = modelDef;
	this._manager = modelManager;
	
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

	this._old_id = this[modelDef.Meta.primaryKey];
	
	// create methods
	this.save = Model._save;
	this.validate = Model._validate;
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

/**
 * Returns an object { colname1: ColType1, colname2: ColType2, ... }
 */
Model._getScheme = function() {
	// TODO : cache this?
	
	var scheme = {};

	for (name in this.objects._model) {
		if (name != "Meta") {
			scheme[name] = this.objects._model[name];
		}
	}
	
	return scheme;
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

Field.prototype.getParams = function() {
	return this._params;
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

IntegerField.prototype.toSql = function(value) {
	return value.toString();
}
