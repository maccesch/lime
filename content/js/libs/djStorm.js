/**
 * Model Manager object
 * 
 * @param modelDef
 *            {Object} The model definition, i.e. fields
 */
function ModelManager(modelDef) {
	QuerySet.call(this, modelDef, this);
}

ModelManager.prototype = new QuerySet();

/**
 * Saves a model instance to the db.
 * 
 * @param modelInstance
 *            The model instance to save
 * @param onComplete
 *            {Function} callback function that is called when instance has been
 *            saved. Takes the saved instance as parameter.
 */
ModelManager.prototype.save = function(modelInstance, onComplete) {
	var values = [];
	var cols = []
	for (name in modelInstance._model) {
		var fieldType = modelInstance._model[name];
		if (fieldType instanceof Field) {
			var value = modelInstance[name];
			values.push(fieldType.toSql(value));
			cols.push(fieldType._params.dbColumn);
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
	var query = "UPDATE '" + tableName + "' SET ";
	var assigns = [];
	for (var i = 0; i < cols.length; ++i) {
		assigns.push("'" + cols[i] + "'=" + values[i]);
	}
	query += assigns.join(',') + " WHERE '" + modelInstance._model[primKey]._params.dbColumn + "'=" + modelInstance._model[primKey].toSql(modelInstance._old_id);
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
			var query = "INSERT INTO '" + tableName + "' ('" + cols.join("','") + "') VALUES (" + values.join(",") + ")";
			tx.executeSql(query, [], function(tx, result) {
				modelInstance._new = false;
				modelInstance._old_id = modelInstance[primKey];
				
				Model.replacePlaceholders(modelInstance);
				
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
 * Proxy for a single model instance, that should be loaded lazily.
 * Used for ForeignKeys.
 */
function SingleManager(modelDef, id) {
	ModelManager.call(this, modelDef);
	this._id = id;
}

SingleManager.prototype = new ModelManager();

/**
 * Fetches the instance from the database and calls callback with it as argument.
 */
SingleManager.prototype.get = function(callback) {
	if (this._cache) {
		callback(this._cache);
	} else {
		var self = this;
		QuerySet.prototype.get.call(this, { pk: this._id }, function(instance) {
			self._cache = instance;
			callback(instance);
		});
	}
}

/**
 * Class that represents all instances of modelDef whose field named foreignKey has the value id.
 * Used for the reverse relation of ForeignKey.
 */
function RelatedManager(modelDef, relModelDef, foreignKey, id) {
	ModelManager.call(this, modelDef);
	this._where = "'" + modelDef.Meta.dbTable + "'.'" + modelDef[foreignKey]._params.dbColumn + "'=" + relModelDef[relModelDef.Meta.primaryKey].toSql(id);
//	this._additionalTables.push(relModelDef.Meta.dbTable);
}

RelatedManager.prototype = new ModelManager();

/**
 * A placeholder for RelatedManager. This is replaces by an actual manager
 * when an instance of the model is created.
 * @returns {RelatedManagerPlaceholder}
 */
function RelatedManagerPlaceholder(modelDef, foreignKey) {
	this._modelDef = modelDef;
	this._foreignKey = foreignKey;
}

/**
 * Returns the RelatedManager that should replace this placeholder.
 * @param modelDef Model definition of the model this placeholder is in.
 * @param id Value of the primary key that the concerned instances reference to.
 */
RelatedManagerPlaceholder.prototype.getManager = function(relModelDef, id) {
	return new RelatedManager(this._modelDef, relModelDef, this._foreignKey, id);
}


/**
 * Class that represents a list of model instances that are retrieved by a
 * database query.
 */
function QuerySet(modelDef, manager) {
	this._model = modelDef;
	this._manager = manager;
	
	this._where = "";
	this._extra = "";
	this._joins = [];
	this._additionalTables = [];
	
	this._cache = null;
}

/**
 * Creates a deep copy of this object (except cache).
 */
QuerySet.prototype.clone = function() {
	var newQs = new QuerySet(this._model, this._manager);
	
	newQs._where = this._where.substr(0);
	newQs._extra = this._extra.substr(0);
	newQs._joins = this._joins.slice(0);
	newQs._additionalTables = this._additionalTables.slice(0);
	
	return newQs;
}

/**
 * Extracts model instances from result rows of a database query. Calls callback
 * with the extracted instances when done.
 */
QuerySet.prototype._extractModelInstances = function(rows, modelDef, callback) {

	var self = this;
	
	function getCallback(instance, values, name) {
		
		return function converted(value) {
			values[name] = value;
			instance.__i -= 1;
			if (instance.__i == 0) {
				delete instance.__i;

				Model._initInstance.call(instance, modelDef, self._manager, values);

				instances.push(instance);
				if (instances.length == len) {
					callback(instances);
				}
			}
		}
	}

	var len = rows.length;
	
	var instances = [];
	for (var i = 0; i < len; ++i) {
		var item = rows.item(i);
		var instance = { __i: 0 };
		var values = {}
		
		for (name in modelDef) {
			var type = modelDef[name];
			
			if (type instanceof Field) {
				instance.__i += 1;
				
				var dbCol = name;
				if (type instanceof ForeignKey) {
					dbCol = name + '_id';
				}
				values[name] = dbCol;
			}
		}
		
		for (name in modelDef) {
			var type = modelDef[name];
			if (type instanceof Field) {
				type.toJs(item[values[name]], getCallback(instance, values, name));
			}
		}
		
	}
}

/**
 * Builds the where clause of the sql query, that fetches all instances that are
 * represented by this queryset
 */
QuerySet.prototype._buildWhere = function() {
	if (this._where.length > 0) {
		return " WHERE " + this._where;
	}
	return "";
}

/**
 * Builds the extra clauses (like GROUP BY or ORDER BY) of the sql query, that
 * fetches all instances that are represented by this queryset
 */
QuerySet.prototype._buildExtra = function() {
	if (this._extra.length > 0) {
		return " " + this._extra;
	}
	return "";
}

/**
 * Builds the from clause, that is the table joins and additional table list for the sql query
 */
QuerySet.prototype._buildFrom = function() {
	var table = this._model.Meta.dbTable;
	var model = this._model;
	var from = " FROM '" + table + "'";
	
	for (var i = 0; i < this._joins.length; ++i) {
		var join = this._joins[i];
		var otherTable = join.model.Meta.dbTable;
		from += " JOIN '" + otherTable;
		from += "' ON ('" + table + "'.'" + model[join.column]._params.dbColumn + "'='" + otherTable + "'.'" + join.model.Meta.primaryKey + "')";
		
		table = otherTable;
		model = join.model;
	}
	
	if (this._additionalTables.length) {
		from += ",'" + this._additionalTables.join("','") + "'";
	}
	
	return from;
}

/**
 * Fetches the object that machtes the lookup parameters given by queryObj. The format of queryObj is the same as in filter().
 * If no or more than one result is found, an exception is thrown.
 * @param queryObj
 *            field lookups or Q object.
 * @param onComplete
 *            Callback that is called with the fetched instance.
 */
QuerySet.prototype.get = function(queryObj, onComplete) {
	this.filter(queryObj).all(function(results) {
		if (results.length == 0) {
			throw "No Object found"
		} else if (results.length > 1) {
			throw "More than one Object found"
		} else {
			onComplete(results[0]);
		}
	});
}

/**
 * Fetches all instances of the model which are in the db. This method actually
 * hits the database and evaluates the query set.
 * 
 * @param onComplete
 *            Callback that is called with a list of all instances.
 */
QuerySet.prototype.all = function(onComplete) {
	if (this._cache) {
		onComplete(this._cache.slice(0));
	} else {
		var self = this;
		db.transaction(function (tx) {
			var where = self._buildWhere();
			var from = self._buildFrom();
			var extra = self._buildExtra();
			tx.executeSql("SELECT '" + self._model.Meta.dbTable + "'.*" + from + where + extra, [], function(tx, result) {
				self._extractModelInstances(result.rows, self._model, function(instances) {
					self._cache = instances.slice(0);
					onComplete(instances);
				});
			});
		});
	}
}


/**
 * Returns a QuerySet which represents all instances of the model which validate
 * against queryObj. This QuerySet remains unchanged.
 * 
 * @param queryObj
 *            field lookups or Q object.
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
	newQs._where += "(" + whereStr + ")";
	return newQs;
}

/**
 * Returns a QuerySet which represents all instances of the model which do NOT
 * validate against queryObj. This QuerySet remains unchanged.
 * 
 * @param queryObj
 *            field lookups or Q object.
 */
QuerySet.prototype.exclude = function(queryObj) {
	var newQs = this.filter(queryObj);
	newQs._where = "NOT " + newQs._where;
	return newQs;
}

/**
 * Returns a new QuerySet that is ordered by the given fields.
 * 
 * @example Entry.objects.orderBy('-pub_date', 'headline').all(...);
 */
QuerySet.prototype.orderBy = function() {
	// TODO : foreign keys
	var orderList = [];
	for (var i = 0; i < arguments.length; ++i) {
		var a = arguments[i];
		if (a[0] == "-") {
			orderList.push(this._model.Meta.dbTable + "." + this._model[a.substr(1)]._params.dbColumn + " DESC");
		} else {
			orderList.push(this._model.Meta.dbTable + "." + this._model[a]._params.dbColumn + " ASC");
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
		var col;
		var op;
		if (lus.length > 1) {
			col = lus.slice(0, lus.length - 1).join('__');
			op = lus[lus.length - 1];
			if (!this._isLookupOp(op)) {
				col = col + '__' + op;
				op = 'exact';
			}
		} else {
			col = lus[0];
			op = 'exact';
		}
		
		var val = queryObj[lookup];
		values.push(val);
		
		wheres.push(this._buildCondition(col, op));
	}
	return "(" + wheres.join(") AND (") + ")";
}

/**
 * Returns true if op is a valid lookup operator
 */
QuerySet.prototype._isLookupOp = function(op) {
	return ['exact', 'iexact', 'contains', 'icontains', 'in', 'gt', 'gte', 'lt', 'lte'].indexOf(op) >= 0;
}

/**
 * Builds a part of the sql where condition based on the columns, the lookup
 * operation and the value.
 */
QuerySet.prototype._buildCondition = function(col, op) {
	
	var valPlaceholder = "${" + col + "}";
	var colPlaceholder = "§{" + col + "}"
	
	if (op == 'exact') {
		return colPlaceholder + " = " + valPlaceholder + " COLLATE BINARY";
	} else if (op == 'iexact') {
		return colPlaceholder + " = " + valPlaceholder + " colPlaceholderLATE NOCASE";
	} else if (op == 'contains') {
		return colPlaceholder + " LIKE '%" + valPlaceholder + "%'";
	} else if (op == 'icontains') {
		// TODO : sqlite doesn't support ILIKE
		return colPlaceholder + " LIKE '%" + valPlaceholder + "%'";
	} else if (op == 'in') {
		return colPlaceholder + " IN (" + valPlaceholder + ")";
	} else if (op = 'gt') {
		return colPlaceholder + ">" + valPlaceholder;
	} else if (op = 'gte') {
		return colPlaceholder + ">=" + valPlaceholder;
	} else if (op = 'lt') {
		return colPlaceholder + "<" + valPlaceholder;
	} else if (op = 'lte') {
		return colPlaceholder + "<=" + valPlaceholder;
	}
}

QuerySet.prototype._bindParameters = function(whereStr, values) {
	
	var i = 0;
	var index = whereStr.indexOf('${');
	while (index >= 0) {
		var orig = whereStr.substr(index + 2).split('}', 1)[0];
		var len = orig.length;
		var model = this._model;
		var col = orig;

		// lookup spans multiple tables
		if (col.indexOf('__') >= 0) {
			var cols = col.split('__');
			col = "pk";
			
			for (var j = 0; j < cols.length; ++j) {
				var field = model[col];
				if (!field) {
					throw "Model does not have a field named '" + col + "'";
				}
				if (field instanceof ForeignKey) {
					model = field._refModel.objects._model;
					this._joins.push({
						column: cols[j],
						model: field._refModel.objects._model
					});
				} else {
					col = cols[j];
				}
			}
		}
		
		if (col == "pk") {
			col = model.Meta.primaryKey;
		}
		
		var val = values[i++];

		if (!model[col]) {
			throw "Model does not have a field named '" + col + "'";
		}

		// format val for sql
		if (val instanceof Array) {
			for (var i = 0; i < val.length; ++i) {
				val[i] = model[col].toSql(val[i]);
			}
			val = val.join(',');
		} else {
			val = model[col].toSql(val);
		}
		
//		whereStr = whereStr.substring(0, index) + val + whereStr.substr(index + len + 3);
		whereStr = whereStr.replace("${" + orig + "}", val);
		whereStr = whereStr.replace("§{" + orig + "}", "'" + model.Meta.dbTable + "'.'" + model[col]._params.dbColumn + "'");
		
		index = whereStr.indexOf('${', index + 1);
	}
	
	// remove additional quotes of LIKE clauses
	whereStr = whereStr.replace(/'%'(.*?)'%'/g, "'%$1%'");
	
	return whereStr;
}


/**
 * Creates a lookup object. Used for complex lookups in QuerySet.filter() for
 * example.
 * 
 * @queryObj lookups like in QuerySet.filter()
 * @example Book.objects.filter(Q({ title__exact: "Hello" }).or(Q({
 *          author__exact: "John Doe" })))
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
 * Field of a model.
 * 
 * @param params
 *            {Object} primaryKey: Boolean - This field is the primary key.
 *            unique: Boolean - This field is unique. null: Boolean - This field
 *            can be null choices: Array of [dbValue, displayValue] - This field
 *            can hold exclusively values from choices.
 * @returns {Field}
 */
function Field(params) {
	this._params = params || {};
	if (this._params['primaryKey']) {
		this._params['unique'] = true;
		this._params['null'] = false;
	}
	if (this._params['choices']) {
		this._choicesVals = [];
		var cs = this._params.choices;
		for (var i = 0; i < cs.length; ++i) {
			this._choicesVals.push(cs[i][0]);
		}
	}
}

/**
 * Converts the value, that was fetched from a database query result, to its
 * JavaScript equivalent. Callback is then called with the converted instance.
 */
Field.prototype.toJs = function(value, callback) {
	callback(value);
}

/**
 * Returns value as SQL formatted string
 */
Field.prototype.toSql = function(value) {
	return "'" + value + "'";
}

/**
 * Returns the params object of this field.
 */
Field.prototype.getParams = function() {
	return this._params;
}

/**
 * If value is valid returns true else returns an error msg string
 */
Field.prototype.validate = function(value) {
	if ((value === null || value === undefined) && (!this._params.null)) {
		return "Value must not be " + value;
	} else if (this._params['choices'] && this._choicesVals.indexOf(value) < 0) {
		return "Value must be one of (" + this._choicesVals.toString() + ")";
	}
	return true;
}

/**
 * Model field that represents a string.
 * 
 * @param params
 *            {Object} maxLength: maximal length of string. defaults to 255.
 * @returns  {CharField}
 */
function CharField(params) {
	params = params || {};
	params.maxLength = params.maxLength || 255;
	Field.call(this, params);
}

CharField.prototype = new Field();

CharField.prototype.validate = function(value) {
	
	if (value && value.length > this._params.maxLength) {
		return "Value exceeds max length of " + this._params.maxLength;
	}
	return Field.prototype.validate.call(this, value);
}

/**
 * Model field that represents an integer.
 * 
 * @param params
 *            See Field
 * @returns {IntegerField}
 */
function IntegerField(params) {
	Field.call(this, params);
}

IntegerField.prototype = new Field();

IntegerField.prototype.validate = function(value) {
	value = parseInt(value);
	if (value && isNaN(value)) {
		return "Value is not a valid integer";
	}
	if (this._params['primaryKey'] && !value) {
		return true;
	}
	return Field.prototype.validate.call(this, value);
}

IntegerField.prototype.toSql = function(value) {
	return value.toString();
}

IntegerField.prototype.toJs = function(value, callback) {
	callback(parseInt(value));
}

/**
 * Model field that represents a reference to another model.
 * 
 * @param model
 *            Model to be referenced
 * @param params
 *            See Field
 * @returns {ForeignKey}
 */
function ForeignKey(model, params) {
	Field.call(this, params);
	
	this._refModel = model;
	
}

ForeignKey.prototype = new Field();

ForeignKey.prototype.toSql = function(value) {
	var sqlValue;
	var model = this._refModel.objects._model;
	var refPrimKey = model.Meta.primaryKey;
	
	sqlValue = value[refPrimKey];
	
	return model[refPrimKey].toSql(sqlValue);
}

// TODO : change back toJs into a synchronous method?
ForeignKey.prototype.toJs = function(value, callback) {
//	var manager = new ModelManager(this._refModel.objects._model);
//	manager.get({ pk: value }, callback);
	callback(new SingleManager(this._refModel.objects._model, value));
}

ForeignKey.prototype.validate = function(value) {
	if (value) {
		if (!(value instanceof this._refModel)) {
			return "Value is not a model";
		}
		if (!value['_old_id']) {
			return "Value is not a valid model instance";
		}
	}
	
	return Field.prototype.validate.call(this, value);
}

/**
 * Returns the referenced model.
 */
ForeignKey.prototype.getModel = function() {
	return this._refModel;
}

/**
 * Meta Model object.
 * @param modelDef
 *            {Object} The model definition, i.e. fields
 */
function Model(modelDef) {

	if (!modelDef['Meta']) {
		throw "Meta information missing";
	}
	if (!modelDef.Meta.dbTable) {
		throw "Meta table name missing";
	}
	Model._completeMetaInfo(modelDef);
	Model._processFields(modelDef);
	
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
	
	function getDisplayFunc(name) {
		return function() {
			return this['_' + name + 'Choices'][this[name]];
		}
	}

	// assign initial values
	for (name in values) {
		if (modelDef[name]) {
			this[name] = values[name];
		} else {
			throw "Model has no field named '" + name + "'";
		}
	}
	
	// init fields
	for (name in modelDef) {
		
		if (name != "Meta") {
			
			var type = modelDef[name];
			if (type instanceof Field) {
				// fill with default values
				if (!this[name]) {
					this[name] = type._params['default'];
					if (this[name] instanceof Function) {
						this[name] = this[name]();
					}
				}
				// create get<Name>Display() method for fields with choices.
				var choices = modelDef[name].getParams()['choices'];
				if (choices) {
					var choicesObj = {};
					for (var i = 0; i < choices.length; ++i) {
						choicesObj[choices[i][0]] = choices[i][1];
					}
					this['_' + name + 'Choices'] = choicesObj;
					this['get' + name[0].toUpperCase() + name.substr(1) + 'Display'] = getDisplayFunc(name);
				}
			} else {
				// copy everything that is not a Field from def
				this[name] = type;
			}
		}
	}

	this._old_id = this[modelDef.Meta.primaryKey];
	
	Model.replacePlaceholders(this);
	
	// create methods
	this.save = Model._save;
	this.validate = Model._validate;
}

/**
 * Fills neccessary default params for the fields and adds inverse relations.
 */
Model._processFields = function(modelDef) {
	for (name in modelDef) {
		var type = modelDef[name];
		if (type instanceof Field) {
			
			var defaultName = name;
			if (type instanceof ForeignKey) {
				var relName = type._params['relatedName'] = type._params['relatedName'] || (modelDef.Meta.dbTable + 'Set');
				
				defaultName += "_id";
				
				// add inverse relation to referenced model
				if (relName[relName.length-1] != '+') {
					var refModelDef = type._refModel.objects._model;
					refModelDef[relName] = new RelatedManagerPlaceholder(modelDef, name);
				}
			}
			type._params['dbColumn'] = type._params['dbColumn'] || defaultName;
			type._params['verboseName'] = type._params['verboseName'] || name[0].toUpperCase() + name.slice(1).replace(/([A-Z])/g, " $1");
		}
	}
}

/**
 * Replaces all placeholders by their proper managers
 */
Model.replacePlaceholders = function(instance) {
	var id = instance[instance._model.Meta.primaryKey];
	if (!id) {
		return;
	}
	for (name in instance._model) {
		var type = instance._model[name];
		if (type instanceof RelatedManagerPlaceholder) {
			instance[name] = type.getManager(instance._model, id);
		}
	}	
}

/**
 * Completes needed meta information about a model definition.
 */
Model._completeMetaInfo = function(modelDef) {
	// search for primary key
	for (name in modelDef) {
		var type = modelDef[name];
		if (type instanceof Field && type._params['primaryKey']) {
			modelDef.Meta.primaryKey = name;
			break;
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
 * 
 * @param onComplete
 *            {Function} callback when saving is finished. It is passed the
 *            saved model instance as parameter.
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
		var fieldType = this._model[name];
		if (fieldType instanceof Field) {
			var value = this[name];
			var validationValue = fieldType.validate(value);
			if (validationValue !== true) {
				return validationValue;
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
		var type = this.objects._model[name];
		if (type instanceof Field) {
			scheme[name] = type;
		}
	}
	
	return scheme;
}