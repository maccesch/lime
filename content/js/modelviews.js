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
		viewDescr.cells[key] = function(modelEl) {
			return modelEl[key];
		}
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

		editDescr.get[key] = function(modelEl) {
			if (modelEl['get' + keyUp + 'Display']) {
				return modelEl['get' + keyUp + 'Display']();
			} else {
				return modelEl[key];
			}
		}

		editDescr.show[key] = function(modelEl) {
			var value = editDescr.get[key](modelEl);
			editDescr._viewValueEl[key].setAttribute('value', value);
//			editDescr._editValueEl[key].setAttribute('value', value);
			var editEl = editDescr._editValueEl[key];
			if (editEl.nodeName == 'menulist') {
				var options = editEl.firstChild.childNodes;
				for (var i = 0; i < options.length; ++i) {
					if (options[i].label == value.toString()) {
						dump("hier");
						editEl.selectedIndex = i;
						break;
					}
				}
			} else {
				editEl.value = value;
			}
		}

		editDescr.save[key] = function(modelEl) {
			var value = editDescr._editValueEl[key].value;
			modelEl[key] = (value);
		}

		editDescr.createInputXul[key] = function(fieldType) {
			var input = InputFactory.createInput(fieldType, {
				'class' : 'details-edit-value'
			});
			return input;
		}
		
		editDescr.createXul[key] = function(viewEl, editEl) {
			// view details
			var box = newXulEl('box');
			viewEl.appendChild(box);

			var attrs = {
				'value' : keyUp,
				'class' : 'details-label'
			};

			var label = newXulEl('label', attrs);
			box.appendChild(label);

			editDescr._viewValueEl[key] = newXulEl('label', {
				'class' : 'details-view-value'
			});
			box.appendChild(editDescr._viewValueEl[key]);

			// edit details
			box = newXulEl('box');
			editEl.appendChild(box);

			label = newXulEl('label', attrs);
			box.appendChild(label);

			editDescr._editValueEl[key] = editDescr.createInputXul[key](scheme[key]);

			box.appendChild(editDescr._editValueEl[key]);
		}
	}

	for (key in scheme) {
		createMethods(key);
	}
	return editDescr;
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
			return this.createMenuList(field, attrs);
		}
		
		if (field instanceof CharField) {
			return this.createTextInput(field, attrs);
		} else if (field instanceof IntegerField) {
			return this.createTextInput(field, Object.merge(attrs, {
				type : 'number'
			}));
		}
	},

	createTextInput : function(field, params) {
		var input = newXulEl('textbox', params);
		return input;
	},
	
	createMenuList: function(field, params) {
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
		
		fieldParams.choices.each(function(choice, index) {
			if (defaultVal === choice[0]) {
				sel = index;
			}
			item = newXulEl('menuitem', {
				value: choice[0],
				label: choice[1]
			});
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
				'label' : key,
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
			$(row).adopt(newXulEl('treecell', {
				'label' : this.listViewDescr.cells[key](object)
			}));
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
			cells[index].setAttribute('label', this.listViewDescr.cells[key]
					(object));
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
		var vbox = newXulEl('vbox');

		var box = newXulEl('vbox', {
			'flex' : 1
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
		var vbox = newXulEl('vbox');

		var box = newXulEl('vbox', {
			'flex' : 1
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
			'flex' : 1
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
			'flex' : 0
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
