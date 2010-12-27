
(function () {
	function loadModule(moduleName) {
		var path = "chrome://lime/content/modules/" + moduleName + "/";
		
		var initScript = newXulEl('script', {
			'src': path + 'js/init.js',
			'type': 'text/javascript'
		});
		
		loadScript(path + 'js/init.js');
	}
	
	window.addEvent('load', function() {
		INSTALLED_MODULES.each(loadModule);
	});
})();


