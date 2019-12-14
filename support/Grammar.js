import {QueryExpression} from '../query/QueryExpression';

export class Grammar {
	marker = '?';
	table_prefix = '';

	constructor(marker = null) {
		if (marker) {
			this.marker = marker;
		}
	}

	wrapList = values => {
		return values.map(this.wrap);
	};

	wrapTable = table => {
		if (this.isExpresion(table)) {
			return this.getValue(table);
		}
		return this.wrap(this.table_prefix + table.toString(), true);
	};

	wrap = (value, prefix_alias = false) => {
		if (this.isExpresion(value)) {
			return this.getValue(value);
		}
		if (value.toLowerCase().includes(' as ')) {
			const segments = value.split(' ');
			if (prefix_alias) {
				segments[2] = this.table_prefix + segments[2];
			}
			return this.wrap(segments[0]) + ' AS ' + this.wrapValue(segments[2]);
		}

		let wrapped = [];
		const segments = value.split('.');
		for (const [key, segment] of Object.entries(segments)) {
			if (key === 0 && segments.length > 1) {
				wrapped.push(this.wrapTable(segment));
			} else {
				wrapped.push(this.wrapValue(segment));
			}
		}
		return wrapped.join('.');
	};

	wrapValue = value => {
		if (value === '*') {
			return value;
		}
		return '`' + value.replace('"', '""') + '`';
		//return value;
	};

	getValue = expression => {
		return expression.toString();
	};

	columnize = columns => {
		return columns.map(this.wrap).join(', ');
	};

	parameterize = columns => {
		return columns.map(this.parameter).join(', ');
	};

	parameter = value => {
		if (this.isExpresion(value)) {
			return this.getValue(value);
		}

		return this.getMarker();
	};

	getTablePrefix = () => {
		return this.table_prefix;
	};

	setTablePrefix = prefix => {
		this.table_prefix = prefix;
	};

	getMarker = () => {
		return this.marker;
	};

	isExpresion = value => {
		return value instanceof QueryExpression;
	};
}
