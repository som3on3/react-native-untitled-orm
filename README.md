# react-native-untitled-orm
A Laravel Eloquent like ORM, 
currently only query builder (in development)

This package depends on react-native-sqlite-storage

How to use:

DatabaseManager.setConfig({name: 'sqlite_file_name.db'});

DatabaseManager.table('users').find(user_id).then(user => {
			console.log(user);
});
