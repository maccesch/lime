
var LiteratureType;

(function() {
	
	var TYPE_CHOICES = [
        [1, "Buch"],
        [2, "Broschüre"],
        [3, "CD"],
        [4, "DVD"],
        [5, "VHS"]
	];

	LiteratureType = new Model({
		Meta: {
			dbTable: "literature_types"
		},
		
		title: new CharField({ verboseName: 'Titel' }),
		shortcut: new CharField({ maxLength: 6, verboseName: 'Abkürzung' }),
		orderId: new CharField({ maxLength: 10, primaryKey: true, verboseName: 'Bestellnr' }),
		type: new IntegerField({ choices: TYPE_CHOICES, verboseName: 'Typ' }),
		languages: new ManyToManyField(Language, { relatedName: 'literatureTypes', verboseName: 'Sprachen' }),
		stockable: new BooleanField({ verboseName: 'Lagerartikel' })
	});

})();