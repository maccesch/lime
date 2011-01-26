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
	for (name in model.getScheme()) {
		columns.push(name);
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
				callback(modelEl[key]);
			}
		}
		viewDescr.cells[key].title = model.objects._model[key].getParams().verboseName;
	});
	return viewDescr;
}

function createDefaultEditDescr(model) {
	var editDescr = {
		save : {},
		get : {},
		show : {},
		createXul : {},
		createInputXul : {},
		create : function() {
			return new model();
		},
		_viewValueEl : {},
		_editValueEl : {}
	}
	
	var scheme = model.getScheme();

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
				} else {
					editEl.value = value;
				}
			});
		}

		editDescr.save[key] = function(modelEl) {
			var editEl = editDescr._editValueEl[key];
			var value;
			if (editEl.nodeName == 'menulist') {
				value = editEl.selectedItem.object;
			} else {
				value = editEl.value;
			}
			if (modelEl[key].set) {
				modelEl[key].set(value);
			} else {
				modelEl[key] = (value);
			}
		}

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

			label = newXulEl('label', attrs);
			box.appendChild(label);

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
		} else {
			return this.createLabel(field, attrs);
		}
	},
	
	createLabel: function(field, attrs) {
		return newXulEl('label', attrs);
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
		}
		return this.createTextInput(field, attrs);
	},

	createTextInput : function(field, params) {
		var input = newXulEl('textbox', params);
		return input;
	},
	
	createForeignKeyList: function(field, params) {
		var ml = this.createMenuList(field, params, []);
		field.ml = ml.firstChild;
		var primKey = field.getModel().objects._model.Meta.primaryKey;
		
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

		var statusbarpanel = newXulEl('statusbarpanel');
		statusbar.appendChild(statusbarpanel);

		var spacer = newXulEl('spacer', {
			'flex' : 1
		});
		statusbar.appendChild(spacer);

		this.doneButton = newXulEl('button', {
			'label' : 'OK',
			'class' : 'flat'
		});
		statusbarpanel.appendChild(this.doneButton);

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

	createNewModelObject : function() {
		var newObj = this.editDescr.create();
		this.modelObjects.push(newObj);
		this.listView.addObject(newObj);
	},

	attach : function() {

		this.listView.addEvent('select', this.onListSelect.bind(this));

		// this.detailsView.addEvent('change', this.onChange.bind(this));

		this.detailsView.getEditButton().addEvent('click',
				this.onEdit.bind(this));
		this.detailsView.getDoneButton().addEvent('click',
				this.onEditDone.bind(this));

		this.listView.getNewButton().addEvent('click', this.onNew.bind(this));
	},

	startEdit : function() {
		this.listView.deactivate();
		this.detailsView.startEdit();
		// this.detailsView.setObject(this.modelObjects[this.currentIndex]);
	},

	stopEdit : function() {
		var curObj = this.modelObjects[this.currentIndex];

		for (key in this.editDescr.save) {
			this.editDescr.save[key](curObj);
		}

		// TODO : error handling
		this.modelObjects[this.currentIndex].save(function(instance) {
			this.detailsView.stopEdit();
			this.detailsView.setObject(curObj);
			this.editingNew = false;

			this.listView.setObject(this.currentIndex, curObj);
			this.listView.activate();
		}.bind(this));
	},

	onChange : function(key, value) {
		// save changes to model
		this.editDescr.save[key](this.modelObjects[this.currentIndex], value);
		this.listView.setObject(this.currentIndex,
				this.modelObjects[this.currentIndex]);
	},

	onListSelect : function(tree) {
		this.currentIndex = tree.currentIndex;
		this.detailsView.setObject(this.modelObjects[this.currentIndex]);
	},

	onEdit : function() {
		this.startEdit();
	},

	onEditDone : function() {
		this.stopEdit();
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
