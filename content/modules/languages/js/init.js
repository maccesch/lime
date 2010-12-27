
PageManager.getInstance().append('Languages', 'Basic Data', newXulEl('box'));

var initLanguages = function() {
	var objs = [];
	for (var i = 0; i < 100; ++i) {
		var lang = new Language();
		lang.setName('Lieselotte ' + i);
		lang.setShortcut('L' + i);
		objs.push(lang);
	}
	
	var listView = new ImpelClassListView(LanguagePeer, "languages-list-box");
	var detailsView = new ImpelClassDetailsView(LanguagePeer, "languages-details-deck");
	
	var ctrl = new ImpelClassListDetailsController(listView, detailsView);
	ctrl.setModelObjects(objs);
}

