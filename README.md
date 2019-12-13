# react-native-untitled-orm
A Laravel Eloquent like ORM, 
currently only query builder (**in development**)

This package depends on react-native-sqlite-storage

**Installation**
```
yarn add https://github.com/som3on3/react-native-untitled-orm
```
and iOS users don't forget to:
```
cd ios && pod install
```

**How to use:**

```javascript
import {DatabaseManager} from 'react-native-untitled-orm';

DatabaseManager.setConfig({name: 'sqlite_file_name.db'});

DatabaseManager.table('users').find(user_id).then(user => {
			console.log(user);
});
```

**Minimal ORM (atm):**

**Find by id**
```javascript
User.find(2).then(user => {
    console.log(user);
});
```

**Insert/Create**
```javascript
const user = new User();
user.email = 'mail@mail.com';
user.first_name = 'John';
user.last_name = 'Doe';
user.save().then(u => {
    console.log('created', u);
});
```

**Mass Update**
```javascript
User.where('id', '>', 2).update({email: 'massupdate'}).then(results => {
    console.log(results);
});
```
