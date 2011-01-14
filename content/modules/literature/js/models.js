
var LiteratureType;

(function() {
	
	var TYPE_CHOICES = [
        [1, "Book"],
        [2, "Brochure"],
        [3, "CD"],
        [4, "DVD"],
        [5, "VHS"]
	];

	LiteratureType = new Model({
		Meta: {
			dbTable: "literature_types"
		},
		
		title: new CharField(),
		shortcut: new CharField({ maxLength: 5 }),
		orderId: new CharField({ maxLength: 10, primaryKey: true }),
		type: new IntegerField({ choices: TYPE_CHOICES })
	});

})();