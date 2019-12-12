const is_null = obj => {
	return obj === null;
};

const is_array = obj => {
	return Array.isArray(obj);
};

const array_keys = obj => {
	return Object.keys(obj);
};

const array_values = obj => {
	return Object.values(obj);
};

const array_unique = array => {
	return array.filter(function(el, index, arr) {
		return index === arr.indexOf(el);
	});
};

const ksort = obj => {
	const keys = Object.keys(obj).sort();
	let sortedObj = {};

	for (let i = 0, cnt = keys.length; i < cnt; i++) {
		sortedObj[keys[i]] = obj[keys[i]];
	}

	return sortedObj;
};

export {is_null, is_array, array_keys, array_values, array_unique, ksort};
