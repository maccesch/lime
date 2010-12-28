
// TODO : make a class out of this
/**
 * Returns a list view description of an ImpelClass instance which is very generic.
 * Just gives all columns of the ImpelClass.
 * @param {ImpelPeer} modelPeer The model peer instance to construct the list view from.
 */
function createDefaultImpelClassListViewDescr(modelPeer, options) {
	var viewDescr = {
		cells: {}
	};
	modelPeer.getColumns().each(function(col) {
		var key = col.split('.')[1];
		viewDescr.cells[key] = function(modelEl) {
			return modelEl['get' + key[0].toUpperCase() + key.substr(1)]();
		}
	});
	return viewDescr;
}

function createDefaultImpelClassEditDescr(modelPeer, options) {
	var editDescr = {
		save: {},
		get: {},
		show: {},
		createXul: {},
		create: function() {
			return eval('new ' + modelPeer.getBaseObjName() + '();');
		},
		_viewValueEl: {},
		_editValueEl: {}
	}
	modelPeer.getColumns().each(function(col) {
		var key = col.split('.')[1];
		var keyUp = key[0].toUpperCase() + key.substr(1);
		
		editDescr.get[key] = function(modelEl) {
			return modelEl['get' + keyUp]();
		}
		
		editDescr.show[key] = function(modelEl) {
			alert(key);
			var value = editDescr.get[key](modelEl);
			editDescr._viewValueEl[key].setAttribute('value', value);
			editDescr._editValueEl[key].setAttribute('value', value);
		}
		
		editDescr.save[key] = function(modelEl, value) {
			return modelEl['set' + keyUp](value);
		}
		
		editDescr.createXul[key] = function(viewEl, editEl) {
			var attrs = {
				'value': keyUp,
				'class': 'details-label'
			};
			
			var label1 = newXulEl('label', attrs);
			var label2 = newXulEl('label', attrs);
			viewEl.appendChild(label1);
			editEl.appendChild(label2);
			
			editDescr._viewValueEl[key] = newXulEl('label', {
				'class': 'details-view-value'
			});
			viewEl.appendChild(editDescr._viewValueEl[key]);
			
			editDescr._editValueEl[key] = newXulEl('textbox', {
				'class': 'details-edit-value'
			});
			editEl.appendChild(editDescr._editValueEl[key]);
		}
	});
	return editDescr;
}

/*
 * Events: select
 */
var ImpelClassListView = new Class({
	Implements: Events,
	
	initialize: function(listViewDescr, parentEl) {
		
		this.listViewDescr = listViewDescr;
		
		this.generateXul(parentEl);
		
		this.tree.addEvent('select', function(event) {
			this.fireEvent('select', this.tree);
		}.bind(this));
		
		ImpelClassListView.instanceNo += 1;
	},
	
	generateXul: function(parentEl) {
		
		this.treeChildren = newXulEl('treechildren');
		var cols = newXulEl('treecols');
		var i = 0;
		var splitter;
		this.treecols = [];
		for (key in this.listViewDescr.cells) {
			++i;
			var col = newXulEl('treecol', {
				'label': key,
				'flex': 1,
				'persist': 'width hidden',
				'id': ImpelClassListView.instanceNo + '-list-view',
				'key': key
			});
			cols.appendChild(col);
			this.treecols.push(col);
			splitter = newXulEl('splitter', {
				'class': 'tree-splitter'
			});
			cols.appendChild(splitter);
		}
		this.tree = $(newXulEl('tree', { 'flex': 1 }));
		this.tree.adopt(cols, this.treeChildren);
		
		var box = newXulEl('box', { 'flex': 1 });
		box.appendChild(this.tree);
		parentEl.appendChild(box);
		
		parentEl.appendChild(this._generateStatusbarXul());
	},
	
	_generateStatusbarXul: function() {
		var statusbar = newXulEl('statusbar', { 'class': 'middle' });
		
		this.msgPanel = newXulEl('statusbarpanel');
		statusbar.appendChild(this.msgPanel);
		
		var spacer = newXulEl('spacer', { 'flex': 1 });
		statusbar.appendChild(spacer);
		
		var statusbarpanel = newXulEl('statusbarpanel');
		statusbar.appendChild(statusbarpanel);
		
		this.newButton = newXulEl('button', {
			'label': 'New',
			'class': 'flat'
		});
		statusbarpanel.appendChild(this.newButton);
		
		return statusbar;
	},
	
	addObject: function(object) {
		var item = newXulEl('treeitem');
		this.treeChildren.adopt(item);
		var row = newXulEl('treerow', {
			'tooltiptext': "blabla"
		});
		$(item).adopt(row);
		this.treecols.each(function(col, index) {
			var key = col.getAttribute('key');
			$(row).adopt(newXulEl('treecell', {
				'label': this.listViewDescr.cells[key](object)
			}));
		}.bind(this));
	},
	
	setObjects: function(objects) {
		this.clear();
		for (var i = 0; i < objects.length; ++i) {
			this.addObject(objects[i]);
		}
	},
	
	setObject: function(index, object) {
		var cells = this.treeChildren.getChildren()[index].getElements('treecell');
		
		this.treecols.each(function(col, index) {
			var key = col.getAttribute('key');
			cells[index].setAttribute('label', this.listViewDescr.cells[key](object));
		}.bind(this));
	},
	
	clear: function() {
		this.treeChildren.empty();
	},
	
	deactivate: function() {
		this.tree.disabled = true;
	},
	
	activate: function() {
		this.tree.disabled = false;
	},
	
	select: function(index) {
		this.tree.view.selection.select(index);
	},
	
	getNewButton: function() {
		return this.newButton;
	}
});

ImpelClassListView.instanceNo = 0;


var ImpelClassDetailsView = new Class({
	Implements: Events,
	
	initialize: function(editDescr, deckEl) {
		
		this.editDescr = editDescr;
		
		this.generateXul(deckEl);
	},

	generateXul: function(deckEl) {
		this.deck = deckEl;
		var viewEl = this._generateViewXul();
		var editEl = this._generateEditXul();
		
		this.deck.appendChild(viewEl);
		this.deck.appendChild(editEl);
		
		for (key in this.editDescr.createXul) {
			this.editDescr.createXul[key](this.viewEl, this.editEl);
		}
	},
	
	_generateViewXul: function() {
		var vbox = newXulEl('vbox');
		
		var box = newXulEl('box', { 'flex': 1 });
		vbox.appendChild(box);
		
		var statusbar = newXulEl('statusbar', { 'class': 'details-satusbar' });
		vbox.appendChild(statusbar);
		
		var statusbarpanel = newXulEl('statusbarpanel');
		statusbar.appendChild(statusbarpanel);
		
		var spacer = newXulEl('spacer', { 'flex': 1 });
		statusbar.appendChild(spacer);
		
		this.editButton = newXulEl('button', {
			'label': 'Edit',
			'class': 'flat'
		});
		statusbarpanel.appendChild(this.editButton);
		
		this.viewEl = box;
		
		return vbox;
	},
	
	_generateEditXul: function() {
		var vbox = newXulEl('vbox');
		
		var box = newXulEl('box', { 'flex': 1 });
		vbox.appendChild(box);
		
		var statusbar = newXulEl('statusbar', { 'class': 'details-satusbar' });
		vbox.appendChild(statusbar);
		
		var statusbarpanel = newXulEl('statusbarpanel');
		statusbar.appendChild(statusbarpanel);
		
		var spacer = newXulEl('spacer', { 'flex': 1 });
		statusbar.appendChild(spacer);
		
		this.doneButton = newXulEl('button', {
			'label': 'Done',
			'class': 'flat'
		});
		statusbarpanel.appendChild(this.doneButton);
		
		this.editEl = box;
		
		return vbox;
	},
	
	setObject: function(object) {
		alert(object);
		for (key in this.editDescr.show) {
			this.editDescr.show[key](object);
		}
	},
	
	startEdit: function() {
		this.deck.selectedIndex = 1;
	},
	
	stopEdit: function() {
		this.deck.selectedIndex = 0;
	},
	
	isEditing: function() {
		return this.deck.selectedIndex == 1;
	},
	
	getEditDescr: function() {
		return this.editDescr;
	},
	
	getEditButton: function() {
		return this.editButton;
	},
	
	getDoneButton: function() {
		return this.doneButton;
	}
});

var ImpelClassListDetailsController = new Class({
	initialize: function(listViewDescr, editDescr) {
		
		this.generateXul();
		
		this.listView = new ImpelClassListView(listViewDescr, this.listEl);
		this.detailsView = new ImpelClassDetailsView(editDescr, this.detailsEl);

		this.editDescr = editDescr;
		
		this.editingNew = false;
		
		this.modelObjects = [];
		
		this.attach();
	},
	
	generateXul: function() {
		this.el = newXulEl('box', { 'flex': 1 });

		this.listEl = newXulEl('vbox', { 'flex': 1 });
		this.el.appendChild(this.listEl);
		
		var splitter = newXulEl('splitter', { 'state': 'open' });
		splitter.appendChild(newXulEl('spacer', { 'flex': 1 }));
		splitter.appendChild(newXulEl('statusbar', { 'class': 'middle' }));
		this.el.appendChild(splitter);
		
		this.detailsEl = newXulEl('deck', { 'selectedIndex': 0 });
		this.el.appendChild(this.detailsEl);
		
	},
	
	setModelObjects: function(objs) {
		this.modelObjects = objs.slice(0);
		this.listView.setObjects(objs);
	},
	
	createNewModelObject: function() {
		var newObj = this.editDescr.create();
		this.modelObjects.push(newObj);
		this.listView.addObject(newObj);
	},
	
	attach: function() {

		this.listView.addEvent('select', this.onListSelect.bind(this));
		
		this.detailsView.addEvent('change', this.onChange.bind(this));
		
		this.detailsView.getEditButton().addEvent('click', this.onEdit.bind(this));
		this.detailsView.getDoneButton().addEvent('click', this.onEditDone.bind(this));
		
		this.listView.getNewButton().addEvent('click', this.onNew.bind(this));
	},
	
	startEdit: function() {
		this.listView.deactivate();
		this.detailsView.startEdit();
		this.detailsView.setObject(this.modelObjects[this.currentIndex]);
	},
	
	stopEdit: function() {
		this.detailsView.stopEdit();
		this.detailsView.setObject(this.modelObjects[this.currentIndex]);
		this.editingNew = false;
		
		// TODO : error handling
		this.modelObjects[this.currentIndex].save();
				
		this.listView.setObject(this.currentIndex, this.modelObjects[this.currentIndex]);
		this.listView.activate();
	},
	
	onChange: function(key, value) {
		// save changes to model
		this.editDescr.save[key](this.modelObjects[this.currentIndex], value);
		this.listView.setObject(this.currentIndex, this.modelObjects[this.currentIndex]);
	},
	
	onListSelect: function(tree) {
		this.currentIndex = tree.currentIndex;
		alert(this.modelObjects);
		alert(this.modelObjects[this.currentIndex]);
		this.detailsView.setObject(this.modelObjects[this.currentIndex]);
	},
	
	onEdit: function() {
		this.startEdit();
	},
	
	onEditDone: function() {
		this.stopEdit();
	},
	
	onNew: function() {
		this.createNewModelObject();
		this.listView.select(this.modelObjects.length-1);
		this.editingNew = true;
		this.startEdit();
	},
	
	getElement: function() {
		return this.el;
	}
});
