
(function() {
	
	var listViewDescr = createDefaultListViewDescr(LiteratureType);
	var editDescr = createDefaultEditDescr(LiteratureType);
	var ctrl = new ListDetailsController(listViewDescr, editDescr);

	function fetchAllLanguages(tx) {
/*		Language.objects.get({ shortcut: 'X'}, function(obj) {
			obj.literatureTypes.all(function (objs) {
				ctrl.setModelObjects(objs);
				
				PageManager.getInstance().append('Literatur', 'Basisdaten', ctrl.getElement(), 'Suche in Literatur', onSearch);
			});
		}); */
		LiteratureType.objects.orderBy('type', 'title').all(function (objs) {	
			ctrl.setModelObjects(objs);
			
			PageManager.getInstance().append('Literatur', 'Basisdaten', ctrl.getElement(), 'Suche in Literatur', onSearch);
		}); 
	}
	
	db.transaction(fetchAllLanguages);
	
	function onSearch(searchStr) {
		LiteratureType.objects.filter(Q({ title__icontains: searchStr }). or (Q({ shortcut__iexact: searchStr }))).orderBy('type', 'title').all(function (objs) {
			ctrl.setModelObjects(objs);
		});
	}
	
})();