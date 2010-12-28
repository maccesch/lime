
(function() {

	var initLanguages = function() {
		var objs = [];
		for (var i = 0; i < 100; ++i) {
			var lang = new Language();
			lang.setName('Lieselotte ' + i);
			lang.setShortcut('L' + i);
			objs.push(lang);
		}
		
		var listViewDescr = createDefaultImpelClassListViewDescr(LanguagePeer);
		var editDescr = createDefaultImpelClassEditDescr(LanguagePeer);
		
		var ctrl = new ImpelClassListDetailsController(listViewDescr, editDescr);
		ctrl.setModelObjects(objs);
		
		return ctrl.getElement();
	}
	
	PageManager.getInstance().append('Languages', 'Basic Data', initLanguages());

})();