Impel.db = openDatabase("test", "1.0", "Zum tesde, gell");
/*
var Kuh = new Class({
	Extends: ImpelClass,
	peer_class: "KuhPeer",
	toString: function() {
		return this.getName();
	}
});

var KuhPeer = new ImpelPeer({
	'columns': {
		'id': 'kuh.id',
		'name': 'kuh.name'
	},
	'table': 'kuh',
	'base_object': 'Kuh'
});
*/

var Language = new Class({
	Extends: ImpelClass,
	peer_class: "LanguagePeer",
	toString: function() {
		return this.getName();
	}
});

var LanguagePeer = new ImpelPeer({
	columns: {
		'name': 'language.name',
		'shortcut': 'language.shortcut'
	},
	table: 'language',
	base_object: 'Language'
});

/*
var kuh = new Kuh();
kuh.setName('Paula');
kuh.save(); 

kuh = new Kuh();
kuh.setName('Lieselotte');
kuh.save(); 

kuh = new Kuh();
kuh.setName('Lieselotte');
kuh.save(); 
*/
/*
var c = new Impel.Criteria();
c.add("KuhPeer::name", "Lieselotte");
KuhPeer.doSelect(c, function(kuhs) {
	kuhs.each(function(kuh) {
		window.alert(kuh.getId());
	});
}); */

