import {DatabaseManager as DB} from '../DatabaseManager';
import {is_array} from 'react-native-untitled-orm/support/Helpers';

export class Model {
	_query = null;
	_skip = [];

	constructor(obj = {}) {
		this._skip = ['_query', '_skip'];
		for (const [key, value] of Object.entries(this)) {
			if (typeof value === 'function') {
				this._skip.push(key);
			}
		}
		this.mapToObject(obj);
	}

	get table() {
		let name = this.constructor.name.toLowerCase();
		if (name.slice(-1) !== 'y') {
			name += 's';
		}
		return name;
	}

	mapToObject(obj) {
		if (obj) {
			for (const [key, value] of Object.entries(obj)) {
				if (!this._skip.includes(key)) {
					this[key] = value;
				}
			}
		}
	}

	static where(column, operator = null, value = null, boolean = 'and') {
		const model = new this();
		return model.where(column, operator, value, boolean);
	}

	where = (column, operator = null, value = null, boolean = 'and') => {
		this.query = this.query.where(column, operator, value, boolean);
		return this;
	};

	static async find(id) {
		if (!id) {
			return null;
		}
		const model = new this();
		return await model.find(id);
	}

	find = async id => {
		this.query = this.newQuery();
		const data = await this.query.find(id);
		if (data) {
			this.mapToObject(data);
			return this;
		}
		return null;
	};

	static async all(columns = ['*']) {
		const model = new this();
		return await model.all(columns);
	}

	all = async (columns = ['*']) => {
		return await this.get(columns);
	};

	get = async (columns = ['*']) => {
		const results = await this.query.get();
		return results.map(result => new this.constructor(result));
	};

	first = async (columns = ['*']) => {
		this.query.limit(1);
		const items = await this.get(columns);
		if (items.length > 0) {
			return items[0];
		}
		return null;
	};

	async save() {
		let data = {};
		for (const [key, value] of Object.entries(this)) {
			if (!this._skip.includes(key)) {
				data[key] = value;
			}
		}
		if (data.id && data.id > 0) {
			const u = await this.find(data.id);
			if (u) {
				return await this.update(data);
			} else {
				return await this.insert(data);
			}
		}
		return await this.insert(data);
	}

	update = async data => {
		await this.query.update(data);
		if (this.id && this.id > 0) {
			return await this.find(this.id);
		} else {
			return await this.get();
		}
	};

	insert = async data => {
		const insert_id = await this.query.insert(data);
		if (insert_id > 0) {
			return await this.find(insert_id);
		}
		return null;
	};

	get query() {
		if (!this._query) {
			this._query = this.newQuery();
		}
		return this._query;
	}

	set query(q) {
		this._query = q;
	}

	get guarded() {
		return [];
	}

	newQuery = () => {
		return DB.table(this.table);
	};
}
