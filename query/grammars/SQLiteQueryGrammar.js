import {QueryGrammar} from './QueryGrammar';

export class SQLiteQueryGrammar extends QueryGrammar {
	_operators = [
		'=',
		'<',
		'>',
		'<=',
		'>=',
		'<>',
		'!=',
		'like',
		'not like',
		'between',
		'ilike',
		'&',
		'|',
		'<<',
		'>>',
	];

	compileTruncate = query => {
		let sql = {};
		sql['DELETE FROM sqlite_sequence WHERE name = ' + this.getMarker()] = [
			query.from_,
		];
		sql['DELETE FROM ' + this.wrapTable(query.from_)] = [];
		return sql;
	};
}
