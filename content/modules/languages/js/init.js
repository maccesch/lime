
(function() {

	var listViewDescr = createDefaultListViewDescr(['name', 'shortcut']);
	var editDescr = createDefaultEditDescr(['name', 'shortcut']);

	function fetchAllLanguages(tx) {
		tx.executeSql('SELECT * FROM languages;', [], function(tx, results) {
			var len = results.rows.length;

			var objs = [];
			for (var i = 0; i < len; ++i) {
				objs.push(results.rows.item(i));
			}
			
			var ctrl = new ListDetailsController(listViewDescr, editDescr);
			ctrl.setModelObjects(objs);
			
			PageManager.getInstance().append('Sprachen', 'Basisdaten', ctrl, 'Suche in Sprachen', onSearch);
		});
	}
	
	db.transaction(fetchAllLanguages);
	
	function onSearch(searchStr) {
		alert(searchStr);
	}
	
})();