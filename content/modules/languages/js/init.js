
(function() {
	
	var listViewDescr = createDefaultListViewDescr(Language);
	var editDescr = createDefaultEditDescr(Language);
	var ctrl = new ListDetailsController(listViewDescr, editDescr);

	function fetchAllLanguages(tx) {
		Language.objects.orderBy('name', 'shortcut').all(function (objs) {	
			ctrl.setModelObjects(objs);
			
			PageManager.getInstance().append('Sprachen', 'Basisdaten', ctrl.getElement(), 'Suche in Sprachen', onSearch);
		});
	}
	
	db.transaction(fetchAllLanguages);
	
	function onSearch(searchStr) {
		Language.objects.filter(Q({ name__icontains: searchStr }). or (Q({ shortcut__iexact: searchStr }))).orderBy('name', 'shortcut').all(function (objs) {
			ctrl.setModelObjects(objs);
		});
	}
	
})();