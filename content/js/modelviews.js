// TODO : make a class out of this
/**
 * Returns a list view description of an ImpelClass instance which is very
 * generic. Just gives all columns of the ImpelClass.
 * 
 * @param {ImpelPeer}
 *            modelPeer The model peer instance to construct the list view from.
 */
function createDefaultListViewDescr(model) {
	var viewDescr = {
		cells : {}
	};
	var columns = [];
	var fields = model.getFields();
	for (name in fields) {
		if (!fields[name].getParams().through) {
			columns.push(name);
		}
	}
	columns.each(function(col) {
		var key = col;
		var keyUp = key[0].toUpperCase() + key.substr(1);
		viewDescr.cells[key] = function(modelEl, callback) {
			if (modelEl['get' + keyUp + 'Display']) {
				callback(modelEl['get' + keyUp + 'Display']());
			} else if (modelEl[key] instanceof SingleManager) {
				modelEl[key].get(callback);
			} else {
				callback(modelEl[key] === undefined ? '-' : modelEl[key]);
			}
		}
		viewDescr.cells[key].title = model.objects._model[key].getParams().verboseName;
	});
	return viewDescr;
}

function createDefaultEditDescr(model, options) {
	
	options = Object.merge({
		locked: [],
	}, options);
	
	var editDescr = {
		save : {},
		get : {},
		show : {},
		createXul : {},
		createInputXul : {},
		create : function() {
			return new model();
		},
		locked: {},
		_viewValueEl : {},
		_editValueEl : {}
	}
	
	var scheme = model.getFields();

	function createMethods(key) {
		var keyUp = key[0].toUpperCase() + key.substr(1);

		editDescr.get[key] = function(modelEl, callback) {
			if (modelEl['get' + keyUp + 'Display']) {
				callback(modelEl['get' + keyUp + 'Display']());
			} else if (modelEl[key] instanceof SingleManager) {
				return modelEl[key].get(callback);
			} else {
				callback(modelEl[key]);
			}
		}

		editDescr.show[key] = function(modelEl) {
			editDescr.get[key](modelEl, function(value) {
				var viewEl = editDescr._viewValueEl[key];
				if (viewEl.nodeName == 'listbox') {
					// ManyToManyField
					while (viewEl.firstChild) {
						viewEl.removeChild(viewEl.firstChild);
					}
					value.all(function(instances) {
						instances.each(function(instance, index) {
							var item = newXulEl('listitem', {
								'label': instance.toString()
							});
							viewEl.appendChild(item);
						});
					});
				} else if (viewEl.nodeName == 'checkbox') {
					viewEl.setAttribute('checked', value);
				} else {
					viewEl.setAttribute('value', value);
				}
				
				var editEl = editDescr._editValueEl[key];
				if (editEl.nodeName == 'menulist') {
					var options = editEl.firstChild.childNodes;
					for (var i = 0; i < options.length; ++i) {
						if (options[i].label == value.toString()) {
							editEl.selectedItem = options[i];
							break;
						}
					}
				} else if (editEl.nodeName == 'multiselectbox') {
					// ManyToManyField
					editEl.clearSelection();

					value.all(function(instances) {
						instances.each(function(instance, index) {
							var primKey = instance._model.Meta.primaryKey;
							
							for (var i = 0; i < editEl.unselectedItems.length; ++i) {
								var item = editEl.unselectedItems[i];
								if (item.object[primKey] == instance[primKey]) {
									editEl.addItemToSelection(item);
									break;
								}
							}
						});
					});
					
				} else if (editEl.nodeName == 'checkbox') {
					editEl.setAttribute('checked', value === undefined ? false : value);
				} else {
					editEl.value = value === undefined ? "" : value;
				}
			});
		}

		editDescr.save[key] = function(modelEl, doneCallback) {
			var editEl = editDescr._editValueEl[key];
			var value;
			if (editEl.nodeName == 'menulist') {
				// choices
				value = editEl.selectedItem.object;
			} else if (editEl.nodeName == 'checkbox') {
				// BooleanField
				value = editEl.checked;
			} else if (editEl.nodeName == 'multiselectbox') {
				// ManyToManyField
				var sel = editEl.selectedItems;
				value = [];
				for ( var i = 0; i < sel.length; i++) {
					value.push(sel[i].object);
				}
			} else {
				value = editEl.value;
			}
			if (modelEl[key] && modelEl[key].set) {
				if (modelEl[key].set.length == 2) {
					modelEl[key].set(value, doneCallback);
				} else {
					modelEl[key].set(value);
					doneCallback();
				}
			} else {
				modelEl[key] = (value);
				doneCallback();
			}
		}
		
		editDescr.locked[key] = options.locked.contains(key);

		editDescr.createXul[key] = function(viewEl, editEl) {
			// view details
			var box = newXulEl('box');
			viewEl.appendChild(box);

			var attrs = {
				'value' : model.objects._model[key].getParams().verboseName,
				'class' : 'details-label ' + key
			};

			var label = newXulEl('label', attrs);
			box.appendChild(label);
			
			var fieldType = model.objects._model[key];
			editDescr._viewValueEl[key] = OutputFactory.createOutput(fieldType, {
				'class' : 'details-view-value ' + key
			}); 
			
			box.appendChild(editDescr._viewValueEl[key]);

			// edit details
			box = newXulEl('box');
			editEl.appendChild(box);

			var labelBox = newXulEl('box', {
				'class': 'label-box'
			});
			box.appendChild(labelBox);

			labelBox.appendChild(newXulEl('spacer', { 'flex': 1 }));

			label = newXulEl('label', attrs);
			labelBox.appendChild(label);

			var lock = newXulEl('lock', {
				'locked': editDescr.locked[key]
			});
			lock.addEvent('click', function() {
				window.setTimeout(function() {
					editDescr.locked[key] = this.locked;
				}.bind(this), 100);
			});
			labelBox.appendChild(lock);

			editDescr._editValueEl[key] = InputFactory.createInput(fieldType, {
				'class' : 'details-edit-value'
			});

			box.appendChild(editDescr._editValueEl[key]);
		}
	}

	for (key in scheme) {
		createMethods(key);
	}
	return editDescr;
}


var OutputFactory = {
	
	createOutput: function(field, attrs) {
		if (field instanceof ManyToManyField) {
			return this.createList(field, attrs);
		} else if (field instanceof BooleanField) {
			return this.createCheckBox(field, attrs);
		} else {
			return this.createLabel(field, attrs);
		}
	},
	
	createLabel: function(field, attrs) {
		return newXulEl('label', attrs);
	},
	
	createCheckBox: function(field, attrs) {
		return newXulEl('checkbox', attrs);
	},
	
	createList: function(field, attrs) {
		var listbox = newXulEl('listbox', attrs);
		return listbox;
	}
}


var InputFactory = {

	createAttrs : function(field) {
		var attrs = {};

		var params = field.getParams();

		if (params['maxLength']) {
			attrs.maxlength = params.maxLength;
		}

		return attrs;
	},

	createInput : function(field, attrs) {
		attrs = Object.merge(attrs, this.createAttrs(field));

		if (field.getParams()['choices']) {
			return this.createMenuList(field, attrs, field.getParams()['choices']);
		}
		
		if (field instanceof IntegerField) {
			return this.createTextInput(field, Object.merge(attrs, {
				type : 'number'
			}));
		} else if (field instanceof ForeignKey) {
			return this.createForeignKeyList(field, attrs);
		} else if (field instanceof ManyToManyField) {
			return this.createMultiSelectBox(field, attrs);
		} else if (field instanceof BooleanField) {
			return this.createCheckBox(field, attrs);
		}
		return this.createTextInput(field, attrs);
	},

	createTextInput : function(field, params) {
		var input = newXulEl('textbox', params);
		return input;
	},
	
	createCheckBox: function(field, params) {
		var input = newXulEl('checkbox', params);
		return input;
	},
	
	createMultiSelectBox: function(field, params) {
		var msb = newXulEl('multiselectbox', Object.merge(params, {
			selectedTitle: 'Ausgewählt',
			availableTitle: 'Verfügbar'
		}));
		field.msb = msb;
		var primKey = field.getModel().objects._model.Meta.primaryKey;
		
		window.setTimeout(function() {
			// TODO : this has to be updated if instances of this model are changed or added or removed
			field.getModel().objects.all(function(instances) {
				instances.each(function(instance) {
					var item = field.msb.appendItem(instance.toString(), false, instance[primKey]);
					item.object = instance;
				});
			});
		}, 1000);
		return msb;
	},
	
	createForeignKeyList: function(field, params) {
		var ml = this.createMenuList(field, params, []);
		field.ml = ml.firstChild;
		var primKey = field.getModel().objects._model.Meta.primaryKey;
		
		// TODO : this has to be updated if instances of this model are changed or added or removed
		field.getModel().objects.all(function(instances) {
			instances.each(function (instance) {
				var item = newXulEl('menuitem', {
					label: instance.toString(),
					value: instance[primKey]
				});
				item.object = instance;
				field.ml.appendChild(item);
			});
			delete field.ml;
		});
		return ml;
	},
	
	createMenuList: function(field, params, choices, objects) {
		var ml = newXulEl('menulist', params);
		var mpop = newXulEl('menupopup');
		ml.appendChild(mpop);
		
		var sel = -1;
		var defaultVal;
		
		var fieldParams = field.getParams();
		if (fieldParams['default']) {
			defaultVal = fieldParams.default;
		}
		if (fieldParams['null']) {
			var item = newXulEl('menuitem', {
				value: 'null',
				label: '-----'
			});
			mpop.appendChild(item);
		}
		
		choices.each(function(choice, index) {
			if (defaultVal === choice[0]) {
				sel = index;
			}
			item = newXulEl('menuitem', {
				value: choice[0],
				label: choice[1]
			});
			if (objects) {
				item.object = objects[index];
			} else {
				item.object = choice[0];
			}
			mpop.appendChild(item);
		});
		ml.selectedIndex = sel;
		
		return ml;
	}
}

/*
 * Events: select
 */
var ListView = new Class({
	Implements : Events,

	initialize : function(listViewDescr, parentEl) {

		this.listViewDescr = listViewDescr;

		this.generateXul(parentEl);

		this.tree.addEvent('select', function(event) {
			this.fireEvent('select', this.tree);
		}.bind(this));

		ListView.instanceNo += 1;
	},

	generateXul : function(parentEl) {

		this.treeChildren = newXulEl('treechildren');
		var cols = newXulEl('treecols');
		var i = 0;
		var splitter;
		this.treecols = [];
		for (key in this.listViewDescr.cells) {
			++i;
			var col = newXulEl('treecol', {
				'label' : this.listViewDescr.cells[key].title,
				'flex' : 1,
				'persist' : 'width hidden',
				'id' : ListView.instanceNo + '-list-view',
				'key' : key
			});
			cols.appendChild(col);
			this.treecols.push(col);
			splitter = newXulEl('splitter', {
				'class' : 'tree-splitter'
			});
			cols.appendChild(splitter);
		}
		this.tree = $(newXulEl('tree', {
			'flex' : 1
		}));
		this.tree.adopt(cols, this.treeChildren);

		var box = newXulEl('box', {
			'flex' : 1
		});
		box.appendChild(this.tree);
		parentEl.appendChild(box);

		parentEl.appendChild(this._generateStatusbarXul());
	},

	_generateStatusbarXul : function() {
		var statusbar = newXulEl('statusbar', {
			'class' : 'middle'
		});

		this.msgPanel = newXulEl('statusbarpanel');
		statusbar.appendChild(this.msgPanel);

		var spacer = newXulEl('spacer', {
			'flex' : 1
		});
		statusbar.appendChild(spacer);

		var statusbarpanel = newXulEl('statusbarpanel');
		statusbar.appendChild(statusbarpanel);

		this.newButton = newXulEl('button', {
			'label' : 'Neu',
			'class' : 'flat'
		});
		statusbarpanel.appendChild(this.newButton);

		return statusbar;
	},

	addObject : function(object) {
		var item = newXulEl('treeitem');
		this.treeChildren.adopt(item);
		var row = newXulEl('treerow', {
			'tooltiptext' : "blabla"
		});
		$(item).adopt(row);
		this.treecols.each(function(col, index) {
			var key = col.getAttribute('key');
			this.listViewDescr.cells[key](object, function(value) {
				$(row).adopt(newXulEl('treecell', {
					'label' : value
				}));
			});
		}.bind(this));
	},

	setObjects : function(objects) {
		this.clear();
		for ( var i = 0; i < objects.length; ++i) {
			this.addObject(objects[i]);
		}
	},

	setObject : function(index, object) {
		var cells = this.treeChildren.getChildren()[index]
				.getElements('treecell');

		this.treecols.each(function(col, index) {
			var key = col.getAttribute('key');
			this.listViewDescr.cells[key](object, function(value) {
				cells[index].setAttribute('label', value);
			});
		}.bind(this));
	},

	clear : function() {
		this.treeChildren.empty();
	},

	deactivate : function() {
		this.tree.disabled = true;
	},

	activate : function() {
		this.tree.disabled = false;
	},

	select : function(index) {
		this.tree.view.selection.select(index);
	},

	getNewButton : function() {
		return this.newButton;
	}
});

ListView.instanceNo = 0;

var DetailsView = new Class({
	Implements : Events,

	initialize : function(editDescr, deckEl) {

		this.editDescr = editDescr;

		this.generateXul(deckEl);
	},

	generateXul : function(deckEl) {
		this.deck = deckEl;
		var viewEl = this._generateViewXul();
		var editEl = this._generateEditXul();

		this.deck.appendChild(viewEl);
		this.deck.appendChild(editEl);

		for (key in this.editDescr.createXul) {
			this.editDescr.createXul[key](this.viewEl, this.editEl);
		}
	},

	_generateViewXul : function() {
		var vbox = newXulEl('vbox', {
		});

		var box = newXulEl('vbox', {
			'flex' : 1,
			'class': 'view'
		});
		vbox.appendChild(box);

		var statusbar = newXulEl('statusbar', {
			'class' : 'details-satusbar'
		});
		vbox.appendChild(statusbar);

		var statusbarpanel = newXulEl('statusbarpanel');
		statusbar.appendChild(statusbarpanel);

		var spacer = newXulEl('spacer', {
			'flex' : 1
		});
		statusbar.appendChild(spacer);

		this.editButton = newXulEl('button', {
			'label' : 'Bearbeiten',
			'class' : 'flat'
		});
		statusbarpanel.appendChild(this.editButton);

		this.viewEl = box;

		return vbox;
	},

	_generateEditXul : function() {
		var vbox = newXulEl('vbox', {
		});

		var box = newXulEl('vbox', {
			'flex' : 1,
			'class': 'edit'
		});
		vbox.appendChild(box);

		var statusbar = newXulEl('statusbar', {
			'class' : 'details-satusbar'
		});
		vbox.appendChild(statusbar);

		var statusbarpanel = newXulEl('statusbarpanel', {
			'flex': 1,
		});
		statusbar.appendChild(statusbarpanel);

		this.doneButton = newXulEl('button', {
			'label' : 'Speichern',
			'class' : 'flat'
		});
		statusbarpanel.appendChild(this.doneButton);

		this.nextButton = newXulEl('button', {
			'label' : 'Nächstes',
			'class' : 'flat'
		});
		statusbarpanel.appendChild(this.nextButton);

		var spacer = newXulEl('spacer', {
			'flex' : 1
		});
		statusbarpanel.appendChild(spacer);

		this.cancelButton = newXulEl('button', {
			'label' : 'Abbrechen',
			'class' : 'flat'
		});
		statusbarpanel.appendChild(this.cancelButton);

		this.editEl = box;

		return vbox;
	},

	setObject : function(object) {
		for (key in this.editDescr.show) {
			this.editDescr.show[key](object);
		}
	},

	startEdit : function() {
		this.deck.selectedIndex = 1;
	},

	stopEdit : function() {
		this.deck.selectedIndex = 0;
	},

	isEditing : function() {
		return this.deck.selectedIndex == 1;
	},

	getEditDescr : function() {
		return this.editDescr;
	},

	getEditButton : function() {
		return this.editButton;
	},

	getDoneButton : function() {
		return this.doneButton;
	},
	
	getNextButton : function() {
		return this.nextButton;
	},
	
	getCancelButton: function() {
		return this.cancelButton;
	}
});

var ListDetailsController = new Class({
	initialize : function(listViewDescr, editDescr) {

		this.generateXul();

		this.listView = new ListView(listViewDescr, this.listEl);
		this.detailsView = new DetailsView(editDescr, this.detailsEl);

		this.editDescr = editDescr;

		this.editingNew = false;

		this.modelObjects = [];

		this.attach();
	},

	generateXul : function() {
		this.el = newXulEl('box', {
			'flex' : 1
		});

		this.listEl = newXulEl('vbox', {
			'flex' : 4,
			'class': 'list'
		});
		this.el.appendChild(this.listEl);

		var splitter = newXulEl('splitter', {
			'state' : 'open'
		});
		splitter.appendChild(newXulEl('spacer', {
			'flex' : 1
		}));
		splitter.appendChild(newXulEl('statusbar', {
			'class' : 'middle'
		}));
		this.el.appendChild(splitter);

		this.detailsEl = newXulEl('deck', {
			'selectedIndex' : 0,
			'flex' : 0,
			'class': 'details'
		});
		this.el.appendChild(this.detailsEl);

	},

	setModelObjects : function(objs) {
		this.modelObjects = objs.slice(0);

		this.listView.setObjects(objs);
	},

	createNewModelObject : function(init, doneCallback) {
		var newObj = this.editDescr.create();
		
		if (init) {
			var fields = Object.keys(init);
			var initField = function(index) {
				if (index < fields.length) {
					var key = fields[index];
					if (newObj[key] && newObj[key].set) {
						if (newObj[key].set.length == 2) {
							// ManyToManyField
							newObj[key].set(init[key], function() {
								initField(index+1);
							}.bind(this));
						} else {
							// ForeignKey
							newObj[key].set(init[key]);
							initField(index+1);
						}
					} else {
						newObj[key] = init[key];
						initField(index+1);
					}
				} else {
					this.modelObjects.push(newObj);
					this.listView.addObject(newObj);
					doneCallback();
				}
			}.bind(this);
			initField(0);
			
		} else {
			this.modelObjects.push(newObj);
			this.listView.addObject(newObj);
		}
	},

	attach : function() {

		this.listView.addEvent('select', this.onListSelect.bind(this));

		// this.detailsView.addEvent('change', this.onChange.bind(this));

		this.detailsView.getEditButton().addEvent('click',
				this.onEdit.bind(this));
		this.detailsView.getDoneButton().addEvent('click',
				this.onEditDone.bind(this));
		this.detailsView.getNextButton().addEvent('click',
				this.onNext.bind(this));
		this.detailsView.getCancelButton().addEvent('click',
				this.onEditCanceled.bind(this));

		this.listView.getNewButton().addEvent('click', this.onNew.bind(this));
	},

	startEdit : function() {
		this.listView.deactivate();
		this.detailsView.startEdit();
		// this.detailsView.setObject(this.modelObjects[this.currentIndex]);
	},

	saveEdit : function(doneCallback) {
		var curObj = this.modelObjects[this.currentIndex];

		var saveFields = [];
		for (key in this.editDescr.save) {
			saveFields.push(key);
		}
		
		var saveField = function(index) {
			if (index < saveFields.length) {
				this.editDescr.save[saveFields[index]](curObj, function() {
					saveField(index + 1);
				});
			} else {
				// TODO : error handling
				this.modelObjects[this.currentIndex].save(function(instance) {
					doneCallback();
				}.bind(this));
			}
		}.bind(this);
		saveField(0);

	},
	
	finishEdit: function() {
		var curObj = this.modelObjects[this.currentIndex];
		this.detailsView.stopEdit();
		this.detailsView.setObject(curObj);
		this.editingNew = false;

		this.listView.setObject(this.currentIndex, curObj);
		this.listView.activate();
	},

//	onChange : function(key, value) {
//		// save changes to model
//		this.editDescr.save[key](this.modelObjects[this.currentIndex], value);
//		this.listView.setObject(this.currentIndex,
//				this.modelObjects[this.currentIndex]);
//	},

	onListSelect : function(tree) {
		this.currentIndex = tree.currentIndex;
		this.detailsView.setObject(this.modelObjects[this.currentIndex]);
	},

	onEdit : function() {
		this.startEdit();
	},

	onEditDone : function() {
		this.saveEdit(this.finishEdit.bind(this));
	},

	onEditCanceled : function() {
		this.finishEdit();
	},
	
	onNext: function() {
		this.saveEdit(function() {
			var curObj = this.modelObjects[this.currentIndex];
			
			var init = {}
			var lockedFields = [];
			for (var key in this.editDescr.locked) {
				if (this.editDescr.locked[key]) {
					lockedFields.push(key);
				}
				
			}
			var addInitKey = function(index) {
				if (index < lockedFields.length) {
					var key = lockedFields[index];
					if (curObj[key].clear) {
						// ManyToManyField
						curObj[key].all(function(instances) {
							init[key] = instances;
							addInitKey(index+1);
						});
					} else if (curObj[key].get) {
						// ForeignKey
						curObj[key].get(function(instance) {
							init[key] = instance;
							addInitKey(index+1);
						});
					} else {
						init[key] = curObj[key];
						addInitKey(index+1);
					}
					
				} else {
					this.createNewModelObject(init, function() {
						this.listView.select(this.modelObjects.length - 1);
						this.editingNew = true;
					}.bind(this));
				}
			}.bind(this);
			addInitKey(0);
		}.bind(this));
	},

	onNew : function() {
		this.createNewModelObject();
		this.listView.select(this.modelObjects.length - 1);
		this.editingNew = true;
		this.startEdit();
	},

	getElement : function() {
		return this.el;
	}
});
