var Language = new Model({
	Meta: {
		dbTable: "languages"
	},
	
	name: new CharField({ maxLength: 50 }),
	shortcut: new CharField({ maxLength: 5, primaryKey: true })
});
/*
var l = new Language({
	name: "Test",
	shortcut: "T"
});

l.save(function(k) {
	k.name = "Test2";
	k.shortcut = "TT";
	k.save();
});
*/
/*
Language.objects.all(function (objs) {
	alert(objs.toSource());
});
*/