
(function () {
	function loadModule(moduleName) {
		var path = "chrome://lime/content/modules/" + moduleName + "/";
		
		var initScript = newXulEl('script', {
			'src': path + 'js/init.js',
			'type': 'application/x-javascript'
		});
		
		loadScript(path + 'js/models.js');
		loadScript(path + 'js/init.js');
	}
	
	// click first sidebar button
	window.addEvent('load', function() {
		INSTALLED_MODULES.each(loadModule);
		window.setTimeout(function() {
			PageManager.getInstance().init();
		} ,100);
	});
})();


