export class QueryProcessor {
	async processSelect(query, results) {
		return await results();
	}
}
