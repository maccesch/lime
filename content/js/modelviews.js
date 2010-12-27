
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
		create: function() {
			return eval('new ' + modelPeer.getBaseObjName() + '();');
		}
	}
	modelPeer.getColumns().each(function(col) {
		var key = col.split('.')[1];
		var keyUp = key[0].toUpperCase() + key.substr(1);
		editDescr.get[key] = function(modelEl) {
			return modelEl['get' + keyUp]();
		}
		editDescr.save[key] = function(modelEl, value) {
			return modelEl['set' + keyUp](value);
		}
	});
	return editDescr;
}

/*
 * Events: select
 */
var ImpelClassListView = new Class({
	Implements: Events,
	
	initialize: function(listViewDescr, insertId) {
		
		if (listViewDescr.getColumns) {
			this.listViewDescr = createDefaultImpelClassListViewDescr(listViewDescr);
		}
		else {
			this.listViewDescr = listViewDescr;
		}
		
		/*
		this.tree = $(insertId).getElement('tree');
		this.treecols = this.tree.getElements('treecol');
		this.treeChildren = this.tree.getElement('treechildren');
		*/
		this.generateXul(insertId);
		
		this.tree.addEvent('select', function(event) {
			this.fireEvent('select', this.tree);
		}.bind(this));
	},
	
	generateXul: function(insertId) {
		this.treeChildren = newXulEl('treechildren');
		var cols = newXulEl('treecols');
		var i = 0;
		var splitter;
		for (key in this.listViewDescr.cells) {
			++i;
			cols.adopt(newXulEl('treecol', {
				'label': key,
				'flex': 1,
				'persist': 'width hidden',
				'id': insertId + '-list-view'
			}));
			splitter = newXulEl('splitter', {
				'class': 'tree-splitter'
			});
			cols.adopt(splitter);
		}
		splitter.destroy();
		this.tree = newXulEl('tree', { 'flex': 1 });
		this.tree.adopt(cols);
		this.tree.adopt(this.treeChildren);
		
		this.treecols = cols;
		$(insertId).adopt(tree);
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
	}
});

var ImpelClassDetailsView = new Class({
	Implements: Events,
	
	initialize: function(editDescr, deckId) {
		
		if (editDescr.getColumns) {
			this.editDescr = createDefaultImpelClassEditDescr(editDescr);
		}
		else {
			this.editDescr = editDescr;
		}
		
		this.dataElements = [[], []];
		
		this.deck = $(deckId);
		
		var el = $(editId);
		for (key in this.editDescr.save) {
			var input = el.getElement('[key="' + key + '"]');
			this.dataElements[1][key] = input;
			
			input.addEvent('change', function(input) {
				this.fireEvent('change', [input.getAttribute('key'), input.value]);
			}.bind(this, input));
		}
		el = $(viewId);
		for (key in this.editDescr.get) {
			var input = el.getElement('[key="' + key + '"]');
			this.dataElements[0][key] = input;
		}
	},

	generateXul: function() {
		var req = new Request({
			url: '/listdetails_template.xul',
			async: false,
			evalResponse: true
		});
	},
	
	setObject: function(object) {
		alert(object);
		var src = null;
		if (this.isEditing()) {
			src = this.editDescr.get;
		} else {
			src = this.detailsViewDescr.cells;
		}
		for (key in this.detailsViewDescr.cells) {
			this.dataElements[this.deck.selectedIndex][key].value = src[key](object);
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
	}
});

var ImpelClassListDetailsController = new Class({
	initialize: function(listView, detailsView) {
		this.listView = listView;
		this.detailsView = detailsView;
		this.editDescr = detailsView.getEditDescr();
		
		this.editingNew = false;
		
		this.modelObjects = [];
		
		this.attach();
	},
	
	setModelObjects: function(objs) {
		this.modelObjects = objs.slice(0);
		this.listView.setObjects(objs);
		statusbarController.setStatus(objs.length + " Objekte");
	},
	
	createNewModelObject: function() {
		var newObj = this.editDescr.create();
		this.modelObjects.push(newObj);
		this.listView.addObject(newObj);
	},
	
	attach: function() {

		this.listView.addEvent('select', this.onListSelect.bind(this));
		
		this.detailsView.addEvent('change', this.onChange.bind(this));
		
		$('edit-button').addEvent('click', this.onEdit.bind(this));
		$('done-button').addEvent('click', this.onEditDone.bind(this));
		
		$('new-button').addEvent('click', this.onNew.bind(this));
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
				
		this.listView.activate();
	},
	
	onChange: function(key, value) {
		// save changes to model
		this.editDescr.save[key](this.modelObjects[this.currentIndex], value);
		this.listView.setObject(this.currentIndex, this.modelObjects[this.currentIndex]);
	},
	
	onListSelect: function(tree) {
		this.currentIndex = tree.wrappedJSObject.currentIndex;
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
	}
});
