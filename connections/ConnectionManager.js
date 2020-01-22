import SQLite from 'react-native-sqlite-storage';
import {AppState} from 'react-native';
import {array_keys, array_values} from '../support/Helpers';
SQLite.DEBUG(false);
SQLite.enablePromise(true);

export class ConnectionManager {
	static instance = null;

	connected = false;
	db = null;
	appState = null;
	insert_id = 0;

	static config = {
		name: 'test.db',
		version: '1.0',
		display_name: 'SQLite Offline Database',
		size: 200000,
	};

	constructor() {
		this.appState = AppState.currentState;
		AppState.addEventListener('change', this._handleAppStateChange);
		this.initDB();
	}

	static setConfig(config) {
		let keys = array_keys(config);
		let values = array_values(config);
		for (let i = 0; i < keys.length; i++) {
			ConnectionManager.config[keys[i]] = values[i];
		}
	}

	_handleAppStateChange = nextAppState => {
		if (
			this.appState.match(/inactive|background/) &&
			nextAppState === 'active'
		) {
			this.initDB();
		} else if (
			this.appState === 'active' &&
			nextAppState.match(/inactive|background/)
		) {
			this.closeDB();
		}
		this.appState = nextAppState;
	};

	closeDB() {
		if (this.connected && this.db) {
			this.db
				.close()
				.then(status => {
					this.connected = false;
					this.db = null;
					console.log('database CLOSED');
				})
				.catch(error => {
					console.log(error);
				});
		}
	}

	waitForConnection(){
		return new Promise(connected => {
			if (this.connected) {
				connected(true);
			} else {
				setTimeout(() => {
					connected(this.waitForConnection());
				}, 2);
			}
		});
	}

	initDB() {
		if (!this.connected) {
			let db;
			SQLite.echoTest()
				.then(() => {
					SQLite.openDatabase(
						ConnectionManager.config.name,
						ConnectionManager.config.version,
						ConnectionManager.config.display_name,
						ConnectionManager.config.size,
					)
						.then(DB => {
							db = DB;
						})
						.catch(error => {
							console.log(error);
						});
				})
				.then(() => {
					setTimeout(() => {
						this.db = db;
						this.connected = true;
					}, 100);
				})
				.catch(error => {
					console.log(error);
				});
		}
	}

	async select(sql, params) {
		if (!this.connected) {
			await this.waitForConnection();
		}
		return new Promise(data => {
			this.db
				.transaction(tx => {
					tx.executeSql(
						sql,
						params,
						(_, results) => {
							this.insert_id = 0;
							if (results.insertId) {
								this.insert_id = results.insertId;
							}
							data(results.rows.raw());
						},
						(_, error) => {
							console.log(error);
						},
					);
				})
				.catch(error => {
					console.log(error.message);
				});
		});
	}

	async insert(sql, params) {
		return await this.select(sql, params);
	}

	async update(sql, params) {
		return await this.select(sql, params);
	}

	async delete(sql, params) {
		return await this.select(sql, params);
	}

	static getInstance() {
		if (!ConnectionManager.instance) {
			ConnectionManager.instance = new ConnectionManager();
		}
		return ConnectionManager.instance;
	}
}
