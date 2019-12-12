import {array_keys, array_values, Grammar, is_array} from '../../support';

export class QueryGrammar extends Grammar {
	select_components = [
		'aggregate',
		'columns',
		'from_',
		'joins',
		'wheres',
		'groups',
		'havings',
		'orders',
		'limit',
		'offset',
		'unions',
		'lock',
	];

	compileSelect = query => {
		if (query.columns.length === 0) {
			query.columns = ['*'];
		}
		return this.concatenate(this.compileComponents(query)).trim();
	};

	compileComponents = (query, _ = null) => {
		let sql = {};
		for (let i = 0, cnt = this.select_components.length; i < cnt; i++) {
			const component = this.select_components[i];
			const component_value = query[component];
			if (component_value) {
				const name = component.replace('_', '');
				const method = 'compile' + name.charAt(0).toUpperCase() + name.slice(1);
				sql[component] = this[method](query, component_value);
			}
		}
		return sql;
	};

	compileAggregate = (query, aggregate) => {
		let column = this.columnize(aggregate.columns);
		if (query.distinct_ && column !== '*') {
			column = 'DISTINCT ' + column;
		}
		return (
			'SELECT ' +
			aggregate.function.toUpperCase() +
			'(' +
			column +
			') AS aggregate'
		);
	};

	compileColumns = (query, columns) => {
		if (query.aggregate) {
			return '';
		}
		const select = query.distinct_ ? 'SELECT DISTINCT ' : 'SELECT ';
		return select + this.columnize(columns);
	};

	compileFrom = (query, table) => {
		return 'FROM ' + this.wrapTable(table);
	};

	compileJoins = (query, joins) => {
		let sql = [];
		query.setBindings([], 'join');

		joins.forEach(join => {
			const table = this.wrapTable(join.table);

			let clauses = [];
			join.clauses.forEach(clause => {
				clauses.push(this.compileJoinConstraints(clause));
			});
			join.bindings.forEach(binding => {
				query.addBinding(binding, 'join');
			});
			clauses[0] = this.removeLeadingBoolean(clauses[0]);

			clauses = clauses.join(' ');
			sql.push(join.type.toUpperCase() + ' JOIN ' + table + ' ON ' + clauses);
		});

		return sql.join(' ');
	};

	compileJoinConstraints = (clause, _ = null) => {
		const first = this.wrapTable(clause.first);
		const second = clause.where ? this.getMarker() : this.wrap(clause.second);

		return [clause.boolean.toUpperCase(), first, clause.operator, second].join(
			' ',
		);
	};

	compileWheres = (query, _ = null) => {
		let sql = [];
		if (query.wheres.length === 0) {
			return '';
		}
		query.wheres.forEach(where => {
			const name = where.type;
			const method = 'where' + name.charAt(0).toUpperCase() + name.slice(1);
			sql.push(where.boolean.toUpperCase() + ' ' + this[method](query, where));
		});

		if (sql.length > 0) {
			sql = sql.join(' ');
			return 'WHERE ' + sql.replace(/AND |OR /i, '');
		}

		return '';
	};

	whereNested = (query, where) => {
		const nested = where.query;
		const wheres = this.compileWheres(nested);
		let sql = [];
		for (let i = 6, cnt = wheres.length; i < cnt; i++) {
			sql.push(wheres[i]);
		}
		return '(' + sql.join('') + ')';
	};

	whereSub = (query, where) => {
		const select = this.compileSelect(where.query);
		return this.wrap(where.column) + ' ' + where.operator + ' (' + select + ')';
	};

	whereBasic = (query, where) => {
		const value = this.parameter(where.value);
		return this.wrap(where.column) + ' ' + where.operator + ' ' + value;
	};

	whereBetween = (query, where) => {
		const between = where.not ? 'NOT BETWEEN' : 'BETWEEN';
		return (
			[this.wrap(where.column), between, this.getMarker()].join(' ') +
			' AND ' +
			this.getMarker()
		);
	};

	whereExists = (query, where) => {
		return 'EXISTS (' + this.compileSelect(where.query) + ')';
	};

	whereNotExists = (query, where) => {
		return 'NOT EXISTS (' + this.compileSelect(where.query) + ')';
	};

	whereIn = (query, where) => {
		if (!where.values || where.values.length === 0) {
			return '0 = 1';
		}
		const values = this.parameterize(where.values);
		return this.wrap(where.column) + ' IN (' + values + ')';
	};

	whereNotIn = (query, where) => {
		if (!where.values || where.values.length === 0) {
			return '1 = 1';
		}
		const values = this.parameterize(where.values);
		return this.wrap(where.column) + ' NOT IN (' + values + ')';
	};

	whereInSub = (query, where) => {
		const select = this.compileSelect(where.query);
		return this.wrap(where.column) + ' IN (' + select + ')';
	};

	whereNotInSub = (query, where) => {
		const select = this.compileSelect(where.query);
		return this.wrap(where.column) + ' NOT IN (' + select + ')';
	};

	whereNull = (query, where) => {
		return this.wrap(where.column) + ' IS NULL';
	};

	whereNotNull = (query, where) => {
		return this.wrap(where.column) + ' IS NOT NULL';
	};

	whereRaw = (query, where) => {
		throw new Error('TODO whereRaw');
	};

	compileGroups = (query, groups) => {
		if (!groups || groups.length === 0) {
			return '';
		}
		return 'GROUP BY ' + this.columnize(groups);
	};

	compileHavings = (query, havings) => {
		if (!havings || havings.length === 0) {
			return '';
		}

		const sql = havings.map(this.compileHaving).join(' ');
		return 'HAVING ' + sql.replace(/and |or /i, '');
	};

	compileHaving = having => {
		if (having.type === 'raw') {
			return having.boolean.toUpperCase + ' ' + having.sql;
		}
		return this.compileBasicHaving(having);
	};

	compileBasicHaving = having => {
		const column = this.wrap(having.column);
		const parameter = this.parameter(having.value);

		return [
			having.boolean.toUpperCase(),
			column,
			having.operator,
			parameter,
		].join(' ');
	};

	compileOrders = (query, orders) => {
		if (!orders || orders.length === 0) {
			return '';
		}

		let compiled = [];
		orders.forEach(order => {
			if (order.sql) {
				throw new Error('compileOrders TODO sql');
			} else {
				compiled.push(
					this.wrap(order.column) + ' ' + order.direction.toUpperCase(),
				);
			}
		});

		return 'ORDER BY ' + compiled.join(', ');
	};

	compileLimit = (query, limit) => {
		const l = parseInt(limit.toString(), 0);
		if (l) {
			return 'LIMIT ' + l;
		}
		return '';
	};

	compileOffset = (query, offset) => {
		const l = parseInt(offset.toString(), 0);
		if (l) {
			return 'OFFSET ' + l;
		}
		return '';
	};

	compileUnion = union => {
		const joiner = union.all ? ' UNION ALL ' : ' UNION ';
		return joiner + union.query.toSql();
	};

	compileUnions = (query, _ = null) => {
		let sql = [];
		query.unions.forEach(union => {
			sql.push(this.compileUnion(union));
		});

		if (query.union_orders && query.union_orders.length > 0) {
			sql.push(this.compileOrders(query, query.union_orders));
		}

		if (query.union_limit && query.union_limit.length > 0) {
			sql.push(this.compileLimit(query, query.union_limit));
		}

		if (query.union_offset && query.union_offset.length > 0) {
			sql.push(this.compileOffset(query, query.union_offset));
		}

		return sql.join(' ');
	};

	compileInsert = (query, values) => {
		const table = this.wrapTable(query.from_);
		if (!is_array(values)) {
			values = [values];
		}
		const columns = this.columnize(array_keys(values[0]));
		let parameters = this.parameterize(array_values(values[0]));
		const value = Array(values.length).fill('(' + parameters + ')');
		parameters = value.join(', ');
		return 'INSERT INTO ' + table + ' (' + columns + ') VALUES ' + parameters;
	};

	compileInsertGetId = (query, values, sequence) => {
		return this.compileInsert(query, values);
	};

	compileUpdate = (query, values) => {
		const table = this.wrapTable(query.from_);
		let columns = [];
		const ks = array_keys(values);
		const vs = array_values(values);
		for (let i = 0; i < ks.length; i++) {
			const key = ks[i];
			const value = vs[i];
			columns.push(this.wrap(key) + ' = ' + this.parameter(value));
		}
		columns = columns.join(', ');
		const joins = query.joins ? ' ' + this.compileJoins(query, query.joins) : '';
		let where = this.compileWheres(query);
		return ('UPDATE ' + table + joins + ' SET ' + columns + ' ' + where).trim();
	};

	compileDelete = query => {
		const table = this.wrapTable(query.from_);
		const where = query.wheres.length > 0 ? this.compileWheres(query) : '';
		return ('DELETE FROM ' + table + ' ' + where).trim();
	};

	compileTruncate = query => {
		let value = {};
		value['TRUNCATE ' + this.wrapTable(query.from_)] = [];
		return value;
	};

	concatenate = segments => {
		let parts = [];
		for (let i = 0, cnt = this.select_components.length; i < cnt; i++) {
			const component = this.select_components[i];
			let value = segments[component];
			if (value) {
				parts.push(value);
			}
		}
		return parts.join(' ');
	};

	removeLeadingBoolean = value => {
		return value.replace(/AND |OR /i, '');
	};
}
