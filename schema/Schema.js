import {ColumnType, Table} from './Table';
import {ConnectionManager} from "../connections/ConnectionManager";

export class Schema {
    constructor() {}

    static async create(table, callback) {
        let tbl = new Table(table, 'create');
        callback(tbl);
        const schema = new Schema();
        const sql = schema.createSQL(tbl);

        const conn = ConnectionManager.getInstance();
        return await conn.select(sql);
    }

    static async dropIfExists(table) {
        const sql = 'DROP TABLE IF EXISTS ' + table;
        const conn = ConnectionManager.getInstance();
        return await conn.select(sql);
    }

    static async drop(table) {
        return await Schema.dropIfExists(table);
    }

    createSQL(table) {
        let sql = table._method + ' TABLE IF NOT EXISTS `' + table._table + '` (';
        let columns = [];
        columns.push(
            '`' + table._increments + '` INTEGER PRIMARY KEY AUTOINCREMENT',
        );

        for (let i = 0, cnt = table._columns.length; i < cnt; i++) {
            const obj = table._columns[i];
            let sql_item = ['`' + obj.name + '`'];
            switch (obj.type) {
                case ColumnType.INT:
                    sql_item.push('INTEGER');
                    if (obj.value !== null) {
                        sql_item.push(' DEFAULT ' + obj.value);
                    }
                    break;
                case ColumnType.TEXT:
                    sql_item.push('TEXT');
                    if (obj.value !== null) {
                        sql_item.push(" DEFAULT '" + obj.value + "'");
                    }
                    break;
                case ColumnType.DECIMAL:
                    sql_item.push('REAL');
                    if (obj.value !== null) {
                        sql_item.push(' DEFAULT ' + obj.value);
                    }
                    break;
            }
            columns.push(sql_item.join(' '));
        }

        sql += columns.join(', ');
        sql += ')';

        return sql;
    }
}
