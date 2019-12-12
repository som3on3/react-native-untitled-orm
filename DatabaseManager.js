import {ConnectionManager} from './connections/ConnectionManager';
import {Builder, SQLiteQueryGrammar, SQLiteQueryProcessor} from './query';

export class DatabaseManager {
	static grammar = new SQLiteQueryGrammar();
	static processor = new SQLiteQueryProcessor();

	static setConfig = config => {
		ConnectionManager.setConfig(config);
	};

	static table = table => {
		const connectionManager = ConnectionManager.getInstance();
		const builder = new Builder(
			connectionManager,
			DatabaseManager.grammar,
			DatabaseManager.processor,
		);
		return builder.from(table);
	};
}
