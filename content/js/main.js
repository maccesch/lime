function parseHTML(htmlString){
	var html = document.implementation.createDocument("http://www.w3.org/1999/xhtml", "html", null);
	var body = document.createElementNS("http://www.w3.org/1999/xhtml", "body");
	html.documentElement.appendChild(body);
	
	body.appendChild(Components.classes["@mozilla.org/feed-unescapehtml;1"]
			.getService(Components.interfaces.nsIScriptableUnescapeHTML)
			.parseFragment(htmlString, false, null, body));
	
	return html;
}

function formToJson(theForm) {
   var rv = {};

   if (typeof(theForm) == 'string')
      theForm = document.getElementById(theForm);

   if (theForm) {
      for (var i = 0; i < theForm.elements.length; i++) {
         var el = theForm.elements[i];
         if (el.name) {
            var pushValue = undefined;
            if (
               (el.tagName.toUpperCase() == 'INPUT'
                  && el.type.match(/^text|hidden|password$/i))
               || el.tagName.toUpperCase() == 'TEXTAREA'
               || (el.type.match(/^CHECKBOX|RADIO$/i) && el.checked)
            ){
               pushValue = el.value.length > 0 ? el.value : undefined;
            }
            else if (el.tagName.toUpperCase() == 'SELECT') {
               if( el.multiple ) {
                  var pushValue = [];
                  for( var j = 0; j < el.options.length; j++ )
                     if( el.options[j].selected )
                        pushValue.push( el.options[j].value );
                  if( pushValue.length == 0 ) pushValue = undefined;
               } else {
                  pushValue = el.options[el.selectedIndex].value;
               }
            }
            if( pushValue != undefined ){
               if(rv.hasOwnProperty( el.name ))
                  if( rv[el.name] instanceof Array ) {
                     rv[el.name] = rv[el.name].concat( pushValue );
                  }
                  else {
                     rv[el.name] = [].concat( rv[el.name], pushValue );
                  }
               else {
                  rv[el.name] = el.value;
               }
            }
         }
      }
   }
   return rv;
}

function jsonToUrl(json) {
	var url = "";
	for (key in json) {
		url += '&' + key + '=' + json[key]
	}
	return url.substr(1);
}

function submitForm(formEl, nameValuePairs, defaultUrl) {
	for (name in nameValuePairs) {
		formEl.elements[name].value = nameValuePairs[name];
	}

	var url = formEl.action || defaultUrl;
	var method = formEl.method.toString().toUpperCase();

	var dataStr = jsonToUrl(formToJson(formEl));
	if (method == "GET") {
		url += '?' + dataStr;
		dataStr = null;
	}
	
	req = new XMLHttpRequest();
	
	req.open(method, url, false)
	req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	req.send(dataStr);
	return req.responseText;
}

function main(event) {
	var url="http://localhost:8000/admin/";
	var xrequest = new XMLHttpRequest();
	xrequest.open("GET", url, false);
	xrequest.send(null);
	var result=parseHTML(xrequest.responseText);
	
	var loginForm = result.getElementById('login-form');
	submitForm(loginForm, {
		'username': 'admin',
		'password': 'klingone'
	}, url);

	xrequest = new XMLHttpRequest();
	xrequest.open('GET', 'http://localhost:8000/admin/auth/group/add/', false);
	xrequest.send(null);
	window.alert(xrequest.responseText.toString().search('Can add log entry'));
}

window.addEvent('domready', function() {
	window.setTimeout(function() {
		window.alert($('find-button'));
	
	}, 400);
	document.getElementById('find-button').addEventListener('command', main, true);
});