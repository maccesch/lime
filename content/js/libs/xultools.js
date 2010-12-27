
function loadScript( url)
{
  var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader); 
  //The magic happens here
  loader.loadSubScript( url ); 
}

function newXulEl(tag, props) {
	const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
	var xulEl = document.createElementNS(XUL_NS, tag);
	for (prop in props) {
		xulEl.setAttribute(prop, props[prop]);
	}
	return xulEl;
}
