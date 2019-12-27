export const ColumnType = {
    INT: 0,
    TEXT: 1,
    DECIMAL: 2,
};

export class Table {
    _table = null;
    _increments = 'id';
    _method = 'create';

    _columns = [];

    _currentField = null;

    constructor(table, method) {
        this._table = table;
        this._method = method.toUpperCase();
    }

    increments(name) {
        this._increments = name;
        return this;
    }

    string(name) {
        let obj = this._columns.find(o => o.name === name);
        if (!obj) {
            this._columns.push({
                name: name,
                type: ColumnType.TEXT,
                value: null,
            });
        }
        this._currentField = name;
        return this;
    }

    integer(name) {
        let obj = this._columns.find(o => o.name === name);
        if (!obj) {
            this._columns.push({
                name: name,
                type: ColumnType.INT,
                value: null,
            });
        }
        this._currentField = name;
        return this;
    }

    decimal(name) {
        let obj = this._columns.find(o => o.name === name);
        if (!obj) {
            this._columns.push({
                name: name,
                type: ColumnType.DECIMAL,
                value: null,
            });
        }
        this._currentField = name;
        return this;
    }

    default(value) {
        if (this._currentField) {
            let obj = this._columns.find(o => o.name === this._currentField);
            if (obj) {
                obj.value = value;
            }
        }
    }
}
