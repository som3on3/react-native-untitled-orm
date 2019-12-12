export class QueryExpression {
	value = null;
	constructor(value) {
		this.value = value;
	}

	get_value = () => {
		return this.value;
	};

	toString = () => {
		return this.get_value().toString();
	};
}
