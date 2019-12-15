import {ConnectionManager} from './connections/ConnectionManager';
import {Builder} from './query/Builder';
import {SQLiteQueryGrammar} from './query/grammars/SQLiteQueryGrammar';
import {SQLiteQueryProcessor} from './query/processors/SQLiteQueryProcessor';

export class DatabaseManager {
	static grammar = new SQLiteQueryGrammar();
	static processor = new SQLiteQueryProcessor();

	static setConfig(config) {
		ConnectionManager.setConfig(config);
	}

	static table(table) {
		const connectionManager = ConnectionManager.getInstance();
		const builder = new Builder(
			connectionManager,
			DatabaseManager.grammar,
			DatabaseManager.processor,
		);
		return builder.from(table);
	}
}
