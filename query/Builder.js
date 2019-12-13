import {
	array_keys,
	array_unique,
	array_values,
	is_array, ksort,
} from '../support/Helpers';
import {QueryExpression} from './QueryExpression';
import {JoinClause} from './JoinClause';

export class Builder {
	connection = null;
	grammar = null;
	processor = null;
	bindings = {
		select: [],
		from: [],
		join: [],
		where: [],
		having: [],
		order: [],
		union: [],
		unionOrder: [],
	};
	aggregate = null;
	columns = [];
	distinct_ = false;
	from_ = null;
	joins = [];
	wheres = [];
	groups = [];
	havings = [];
	orders = [];
	limit_ = null;
	offset_ = null;
	unions = [];
	unionLimit = null;
	unionOffset = null;
	unionOrders = null;
	lock = null;
	union_limit = null;
	union_offset = null;
	union_orders = [];

	operators = [
		'=',
		'<',
		'>',
		'<=',
		'>=',
		'<>',
		'!=',
		'<=>',
		'like',
		'like binary',
		'not like',
		'ilike',
		'&',
		'|',
		'^',
		'<<',
		'>>',
		'rlike',
		'not rlike',
		'regexp',
		'not regexp',
		'~',
		'~*',
		'!~',
		'!~*',
		'similar to',
		'not similar to',
		'not ilike',
		'~~*',
		'!~~*',
	];

	constructor(connection, grammar, processor) {
		this.connection = connection;
		this.grammar = grammar;
		this.processor = processor;
	}

	select = (columns = ['*']) => {
		this.columns = columns;
		return this;
	};

	selectRaw = (expressions, bindings = null) => {
		this.addSelect(new QueryExpression(expressions));

		if (bindings) {
			this.addBinding(bindings, 'select');
		}
		return this;
	};

	selectSub = (query, as) => {
		let bindings = [];
		if (query instanceof Builder) {
			bindings = query.getBindings();
			query = query.toSql();
		} else if (query instanceof String) {
			bindings = [];
		} else {
			throw new Error('Invalid subselect');
		}

		const sql = '(' + query + ') as ' + this.grammar.wrap(as);
		return this.selectRaw(sql, bindings);
	};

	addSelect = column => {
		this.columns.push(column);
		return this;
	};

	distinct = () => {
		this.distinct_ = true;
		return this;
	};

	from = table => {
		this.from_ = table;
		return this;
	};

	join = (
		table,
		one = null,
		operator = null,
		two = null,
		type = 'inner',
		where = false,
	) => {
		if (table instanceof JoinClause) {
			this.joins.push(table);
		} else {
			if (!one) {
				throw new Error('Missing "one" argument');
			}
			const join = new JoinClause(table, type);
			join.on(one, operator, two, 'and', where);
			this.joins.push(join);
		}
		return this;
	};

	joinWhere = (table, one, operator, two, type = 'inner') => {
		this.join(table, one, operator, two, type, true);
		return this;
	};

	leftJoin = (table, one = null, operator = null, two = null) => {
		if (table instanceof JoinClause) {
			table.type = 'left';
		}
		return this.join(table, one, operator, two, 'left');
	};

	leftJoinWhere = (table, one, operator, two) => {
		return this.joinWhere(table, one, operator, two, 'left');
	};

	rightJoin = (table, one = null, operator = null, two = null) => {
		if (table instanceof JoinClause) {
			table.type = 'right';
		}
		return this.join(table, one, operator, two, 'right');
	};

	rightJoinWhere = (table, one, operator, two) => {
		return this.joinWhere(table, one, operator, two, 'right');
	};

	addBinding = (value, type = 'where') => {
		if (!value) {
			return this;
		}
		if (this.bindings[type]) {
			this.bindings[type].push(value);
		}
		return this;
	};

	setBindings = (bindings, type = 'where') => {
		if (this.bindings[type]) {
			this.bindings[type] = bindings;
		}
		return this;
	};

	mergeBindings = query => {
		const types = array_keys(this.bindings);
		const bindings = query.getRawBindings();
		types.forEach(type => {
			this.bindings[type] = bindings[type];
		});
		return this;
	};

	merge = query => {
		this.columns.push(...query.columns);
		this.joins.push(...query.joins);
		this.wheres.push(...query.wheres);
		this.groups.push(...query.groups);
		this.havings.push(...query.havings);
		this.orders.push(...query.orders);

		this.distinct_ = query.distinct_;

		this.columns = array_unique(this.columns);

		if (query.limit_) {
			this.limit_ = query.limit_;
		}

		if (query.offset) {
			this.offset = null;
		}

		this.unions.push(...query.unions);

		if (query.union_limit) {
			this.union_limit = query.union_limit;
		}

		if (query.union_offset) {
			this.union_offset = query.union_offset;
		}

		this.union_orders.push(...query.union_orders);

		this.mergeBindings(query);
	};

	getBindings = () => {
		let bindings = [];
		let values = array_values(this.bindings);
		for (let i = 0, cnt = values.length; i < cnt; i++) {
			bindings.push(...values[i]);
		}
		return bindings;
	};

	getRawBindings = () => {
		return this.bindings;
	};

	where = (column, operator = null, value = null, boolean = 'and') => {
		if (column instanceof Object) {
			const ks = array_keys(column);
			const vs = array_values(column);
			for (let i = 0; i < ks.length; i++) {
				const k = ks[i];
				const v = vs[i];
				this.where(k, '=', v);
			}
			return this;
		} else if (column instanceof Builder) {
			return this.whereNested(column, boolean);
		} else if (is_array(column)) {
			const nested = this.newQuery();
			column.forEach(condition => {
				if (is_array(condition) && condition.length === 3) {
					nested.where(condition[0], condition[1], condition[2]);
				} else {
					throw new Error('Invalid conditions in where() clause');
				}
			});
			return this.whereNested(nested, boolean);
		} else {
			if (!value) {
				if (operator) {
					value = operator;
					operator = '=';
				} else {
					throw new Error('Value must be provided');
				}
			}

			if (operator && !this.operators.includes(operator)) {
				value = operator;
				operator = '=';
			}

			if (value instanceof Builder) {
				return this.whereSub(column, operator, value, boolean);
			} else if (!value) {
				return this.whereNull(column, boolean, operator != '=');
			} else {
				const type = 'basic';
				this.wheres.push({
					type: type,
					column: column,
					operator: operator,
					value: value,
					boolean: boolean,
				});

				if (!(value instanceof QueryExpression)) {
					this.addBinding(value, 'where');
				}
			}
			return this;
		}
	};

	orWhere = (column, operator = null, value = null) => {
		return this.where(column, operator, value, 'or');
	};

	invalidOperatorAndValue = (operator, value) => {
		const is_operator = this.operators.includes(operator);
		return is_operator && operator != '=' && !value;
	};

	whereRaw = (sql, bindings = null, boolean = 'and') => {
		const type = 'raw';
		this.wheres.push({type: type, sql: sql, boolean: boolean});
		this.addBinding(bindings, 'where');
		return this;
	};

	orWhereRaw = (sql, bindings = null) => {
		return this.whereRaw(sql, bindings, 'or');
	};

	whereBetween = (column, values, boolean = 'and', negate = false) => {
		const type = 'between';

		this.wheres.push({
			column: column,
			type: type,
			boolean: boolean,
			not: negate,
		});

		this.addBinding(values, 'where');

		return this;
	};

	orWhereBetween = (column, values) => {
		return this.whereBetween(column, values, 'or');
	};

	whereNotBetween = (column, values, boolean = 'and') => {
		return this.whereBetween(column, values, boolean, true);
	};

	orWhereNotBetween = (column, values) => {
		return this.whereNotBetween(column, values, 'or');
	};

	whereNested = (query, boolean = 'and') => {
		query.from(this.from_);
		return this.addNestedWhereQuery(query, boolean);
	};

	forNestedWhere = () => {
		const query = this.newQuery();
		query.from(this.from_);
		return query;
	};

	addNestedWhereQuery = (query, boolean = 'and') => {
		if (query.wheres.length > 0) {
			this.wheres.push({type: 'nested', query: query, boolean: boolean});
			this.mergeBindings(query);
		}
		return this;
	};

	addNestedWhereQuery = (query, boolean = 'and') => {
		if (query.wheres.length > 0) {
			this.wheres.push({type: 'nested', query: query, boolean: boolean});
			this.mergeBindings(query);
		}
		return this;
	};

	whereSub = (column, operator, query, boolean) => {
		const type = 'sub';
		this.wheres.push({
			type: type,
			column: column,
			operator: operator,
			query: query,
			boolean: boolean,
		});
		this.mergeBindings(query);
		return this;
	};

	whereExists = (query, boolean = 'and', negate = false) => {
		let type = '';
		if (negate) {
			type = 'not_exists';
		} else {
			type = 'exists';
		}

		this.wheres.push({type: type, query: query, boolean: boolean});

		this.mergeBindings(query);
		return this;
	};

	orWhereExists = (query, negate = false) => {
		return this.whereExists(query, 'or', negate);
	};

	whereNotExists = (query, boolean = 'and') => {
		return this.whereExists(query, boolean, true);
	};

	orWhereNotExists = query => {
		return this.orWhereExists(query, true);
	};

	whereIn = (column, values, boolean = 'and', negate = false) => {
		const type = negate ? 'not_in' : 'in';
		if (values instanceof Builder) {
			return this.whereInSub(column, values, boolean, negate);
		} else {
			if (is_array(values)) {
				throw new Error('ce masa vine aici...');
			}

			this.wheres.push({
				type: type,
				column: column,
				values: values,
				boolean: boolean,
			});
			this.addBinding(values, 'where');

			return this;
		}
	};

	whereNotIn = (column, values, boolean = 'and') => {
		return this.whereIn(column, values, boolean, true);
	};

	orWhereIn = (column, values) => {
		return this.whereIn(column, values, 'or');
	};

	orWhereNotIn = (column, values) => {
		return this.whereNotIn(column, values, 'or');
	};

	whereInSub = (column, query, boolean, negate = false) => {
		const type = negate ? 'not_in_sub' : 'in_sub';
		this.wheres.push({
			type: type,
			column: column,
			query: query,
			boolean: boolean,
		});
		this.mergeBindings(query);

		return this;
	};

	whereNull = (column, boolean = 'and', negate = false) => {
		const type = negate ? 'not_null' : 'null';
		this.wheres.push({type: type, column: column, boolean: boolean});
		return this;
	};

	whereNotNull = (column, boolean = 'and') => {
		return this.whereNull(column, boolean, true);
	};

	orWhereNull = column => {
		return this.whereNull(column, 'or');
	};

	orWhereNotNull = column => {
		return this.whereNotNull(column, 'or');
	};

	groupBy = columns => {
		this.groups.push(...columns);
		return this;
	};

	having = (column, operator = null, value = null, boolean = 'and') => {
		const type = 'basic';
		this.havings.push({
			type: type,
			column: column,
			operator: operator,
			value: value,
			boolean: boolean,
		});
		if (!(value instanceof QueryExpression)) {
			this.addBinding(value, 'having');
		}
		return this;
	};

	orHaving = (column, operator = null, value = null) => {
		return this.having(column, operator, value, 'or');
	};

	havingRaw = (sql, bindings = null, boolean = 'and') => {
		this.havings.push({type: 'raw', sql: sql, boolean: boolean});
		this.addBinding(bindings, 'having');
		return this;
	};

	orHavingRaw = (sql, bindings = null) => {
		return this.havingRaw(sql, bindings, 'or');
	};

	orderBy = (column, direction = 'asc') => {
		const prop = this.unions.length > 0 ? 'union_orders' : 'orders';
		if (direction.toLowerCase() === 'asc') {
			direction = 'asc';
		} else {
			direction = 'desc';
		}
		this[prop].push({column: column, direction: direction});

		return this;
	};

	latest = (column = 'created_at') => {
		return this.orderBy(column, 'desc');
	};

	oldest = (column = 'created_at') => {
		return this.orderBy(column, 'asc');
	};

	orderByRaw = (sql, bindings = null) => {
		if (!bindings) {
			bindings = [];
		}
		this.orders.push({type: 'raw', sql: sql});
		this.addBinding(bindings, 'order');
		return this;
	};

	offset = value => {
		const prop = this.unions.length > 0 ? 'union_offset' : 'offset';
		this[prop] = Math.max(0, value);
		return this;
	};

	skip = value => {
		this.offset(value);
		return this;
	};

	limit = value => {
		const prop = this.unions.length > 0 ? 'union_limit' : 'limit';
		this[prop] = value;
		return this;
	};

	take = value => {
		this.limit(value);
		return this;
	};

	forPage = (page, per_page = 15) => {
		this.skip((page - 1) * per_page);
		this.take(per_page);
		return this;
	};

	union = (query, all = false) => {
		this.unions.push({query: query, all: all});
		this.mergeBindings(query);
		return this;
	};

	unionAll = query => {
		return this.union(query, true);
	};

	toSql = () => {
		const sql = this.grammar.compileSelect(this);
		return sql;
	};

	find = async (id, columns = ['*']) => {
		this.where('id', '=', id);
		return await this.first(1, columns);
	};

	first = async (limit = 1, columns = ['*']) => {
		this.take(limit);
		const data = await this.get(columns);
		return data && data.length > 0 ? data[0] : null;
	};

	get = async (columns = ['*']) => {
		let original = this.columns;
		if (!original) {
			this.columns = columns;
		}
		const results = await this.processor.processSelect(this, this.runSelect);
		this.columns = original;
		return results;
	};

	insert = async values => {
		if (!values) {
			return true;
		}
		if (!is_array(values)) {
			if (array_keys(values).length === 0) {
				return true;
			}
			values = [values];
		} else {
			for (let i = 0, cnt = values.length; i < cnt; i++) {
				let value = ksort(values[i]);
				values[i] = value;
			}
		}

		let bindings = [];
		values.forEach(record => {
			const record_values = array_values(record);
			bindings.push(...record_values);
		});

		const sql = this.grammar.compileInsert(this, values);
		bindings = this.cleanBindings(bindings);

		try {
			await this.connection.insert(sql, bindings);
			return this.connection.insert_id;
		} catch (e) {
			console.log(e);
		}
	};

	update = async values => {
		let bindings = array_values(values);
		bindings.push(...this.getBindings());
		const sql = this.grammar.compileUpdate(this, values);
		bindings = this.cleanBindings(bindings);
		return await this.connection.update(sql, bindings);
	};

	delete = async (id = null) => {
		if (id) {
			this.where('id', '=', id);
		}
		const sql = this.grammar.compileDelete(this);
		return await this.connection.delete(sql, this.getBindings());
	};

	cleanBindings = bindings => {
		return bindings.filter(binding => !(binding instanceof QueryExpression));
	};

	runSelect = async () => {
		try {
			return await this.connection.select(this.toSql(), this.getBindings());
		} catch (e) {
			console.log(e);
		}
	};

	getLimit = () => {
		return this.limit_;
	};

	min = column => {
		return this.aggregate('min', [column]);
	};

	max = column => {
		return this.aggregate('max', [column]);
	};

	sum = column => {
		return this.aggregate('sum', [column]);
	};

	avg = column => {
		return this.aggregate('avg', [column]);
	};

	newQuery = () => {
		return new Builder(this.connection, this.grammar, this.processor);
	};
}
