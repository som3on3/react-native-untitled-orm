export class QueryProcessor {
	processSelect = async (query, results) => {
		return await results();
	};
}
