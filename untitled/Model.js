import {DatabaseManager as DB} from '../DatabaseManager';

export class Model {
	_query = null;

	constructor(obj = {}) {
		this.mapToObject(obj);
	}

	get fillable() {
		console.error('fillable not defined');
		return [];
	}

	get table() {
		return null;
	}

	mapToObject(obj) {
		if (obj) {
			const allowed = this.fillable;
			for (const [key, value] of Object.entries(obj)) {
				if (allowed.includes(key)) {
					this[key] = value;
				}
			}
		}
	}

	static where(column, operator = null, value = null, boolean = 'and') {
		const model = new this();
		return model.where(column, operator, value, boolean);
	}

	where(column, operator = null, value = null, boolean = 'and') {
		this.query = this.query.where(column, operator, value, boolean);
		return this;
	}

	static orderBy(column, direction = 'asc') {
		const model = new this();
		return model.orderBy(column, direction);
	}

	orderBy(column, direction = 'asc') {
		this.query = this.query.orderBy(column, direction);
		return this;
	}

	static async find(id) {
		if (!id) {
			return null;
		}
		const model = new this();
		return await model.find(id);
	}

	async find(id) {
		this.query = this.newQuery();
		const data = await this.query.find(id);
		if (data) {
			this.mapToObject(data);
			return this;
		}
		return null;
	}

	static async all(columns = ['*']) {
		const model = new this();
		return await model.all(columns);
	}

	async all(columns = ['*']) {
		return await this.rows(columns);
	}

	async delete() {
		return this.query.delete(this.id);
	}

	async rows(columns = ['*']) {
		const results = await this.query.rows(columns);
		return results.map(result => new this.constructor(result));
	}

	async first(columns = ['*']) {
		this.query.limit(1);
		const items = await this.rows(columns);
		if (items.length > 0) {
			return items[0];
		}
		return null;
	}

	async save() {
		let data = {};
		const fill = this.fillable;
		for (const [key, value] of Object.entries(this)) {
			if (fill.includes(key)) {
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

	async update(data) {
		await this.query.update(data);
		if (this.id && this.id > 0) {
			return await this.find(this.id);
		} else {
			return await this.rows();
		}
	}

	async insert(data) {
		const insert_id = await this.query.insert(data);
		if (insert_id > 0) {
			return await this.find(insert_id);
		}
		return null;
	}

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

	newQuery() {
		return DB.table(this.table);
	}
}
