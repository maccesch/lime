
var PageManager = new Class({
	initialize: function() {
		this.sidebarEl = $('sidebar');
		this.contentDeckEl = $('main-content-deck');
	},

	append: function(name, category, pageEl) {
		// append to sidebar
		var catEl = this._getCategoryEl(category);
		var buttonEl = this._createSidebarButton(name);
		this.sidebarEl.insertBefore(buttonEl, catEl);
		
		this.contentDeckEl.adopt(pageEl);
		
		this._attachEvents(buttonEl);
	},
	
	_getCategoryEl: function(category) {
		var id = category.toLowerCase().replace(' ', '-');
		id = 'sidebar-' + id + '-end';
		var catEl = $(id);
		if (!catEl) {
			catEl = newXulEl('vbox', {
				'id': id
			});
			var label = newXulEl('label', {
				value: category.toUpperCase()
			});
			this.sidebarEl.appendChild(label);
			this.sidebarEl.appendChild(catEl);
		}
		return catEl;
	},
	
	_createSidebarButton: function(name) {
		var buttonEl = newXulEl('button', {
			type: 'radio',
			group: 'sidebar-group'
		});
		buttonEl.appendChild(document.createTextNode(name));
		return buttonEl;
	},
	
	_attachEvents: function(buttonEl) {
		buttonEl.deckIndex = this.contentDeckEl.getChildren().length - 1;
		buttonEl.oncommand = function() {
			this.contentDeckEl.selectedIndex = buttonEl.deckIndex;
		};
	},
});

PageManager.getInstance = function() {
	if (!PageManager.instance) {
		PageManager.instance = new PageManager();
	}
	return PageManager.instance;
}
