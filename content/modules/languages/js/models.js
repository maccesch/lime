var Language = new Model({
	Meta: {
		dbTable: "languages"
	},
	
	name: new CharField({ maxLength: 50 }),
	shortcut: new CharField({ maxLength: 5, primaryKey: true, verboseName: "Abk�rzung" }),
	
	toString: function() {
		return this.name;
	}
});
