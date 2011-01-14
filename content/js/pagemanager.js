
var PageManager = new Class({
	initialize: function() {
		this.sidebarEl = $('sidebar');
		this.contentDeckEl = $('main-content-deck');
		
		this.searchEl = $('search-textbox');
		this.searchData = [];
	},

	append: function(name, category, pageEl, searchLabel, searchHandler) {
		// append to sidebar
		var catEl = this._getCategoryEl(category);
		var buttonEl = this._createSidebarButton(name);
		this.sidebarEl.insertBefore(buttonEl, catEl);
		
		if (!this['_firstButton']) {
			this._firstButton = buttonEl;
		}
		
		this.contentDeckEl.adopt(pageEl);
		
		this.searchData.push([searchLabel, searchHandler]);
		
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
		buttonEl.addEvent('click', function() {
			this.contentDeckEl.selectedIndex = buttonEl.deckIndex;
			var searchData = this.searchData[buttonEl.deckIndex];
			this.searchEl.set('emptytext', searchData[0]);
			this.searchEl.set('value', this.searchEl.get('value'));
			this.searchEl.removeEvents('keydown');
			this.searchEl.addEvent('keydown', function(event) {
				if (event.key == 'enter') {
					searchData[1](this.searchEl.get('value'));
				}
			}.bind(this));
		}.bind(this));
	},
	
	init: function() {
		this._firstButton.click();
	}
});

PageManager.getInstance = function() {
	if (!PageManager.instance) {
		PageManager.instance = new PageManager();
	}
	return PageManager.instance;
}
