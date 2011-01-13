var db = openDatabase(DATABASE_NAME, '1.0', 'the lime database', 1024 * 1024);

db.transaction(function (tx) {
	tx.executeSql('PRAGMA foreign_keys = ON');
});

