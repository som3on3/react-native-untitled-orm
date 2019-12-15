import {QueryExpression} from './QueryExpression';

export class JoinClause {
	type = null;
	table = null;
	clauses = [];
	bindings = [];

	constructor(table, type = 'inner') {
		this.table = table;
		this.type = type;
	}

	on(first, operator, second, boolean = 'and', where = false) {
		this.clauses.push({
			first: first,
			operator: operator,
			second: second,
			boolean: boolean,
			where: where,
		});

		if (where) {
			this.bindings.push(second);
		}
	}

	or_on(first, operator, second) {
		this.on(first, operator, second, 'or');
	}

	where(first, operator, second, boolean = 'and') {
		this.on(first, operator, second, boolean, true);
	}

	or_where(first, operator, second) {
		this.where(first, operator, second, 'or');
	}

	where_null(column, boolean = 'and') {
		this.on(column, 'IS', QueryExpression('NULL'), boolean, false);
	}

	or_where_null(column) {
		this.where_null(column, 'or');
	}

	where_not_null(column, boolean = 'and') {
		this.on(column, 'IS', QueryExpression('NOT NULL'), boolean, false);
	}

	or_where_not_null(column) {
		this.where_not_null(column, 'or');
	}
}
