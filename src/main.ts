/**
 * All that is need to use the componetns is the impoort and markup.
 * 
 * This is just a small column-callback demo that colours a numeric column
 * red or green if the value decreases or incrases - and removes the colour
 * after a pre-determined period.
 * 
 */
import './components/TableComponent';
import './components/ColumnComponent';

const table = document.getElementsByTagName('foo-table')[0] as any;

const resetBgAfterMs = 10_000;
const lastValuesById = new Map<string, any>();
const lastBgById = new Map<string, string>();
const resetTimeoutsById = new Map<string, number>();

table.registerColumnCallback('age', (newValue: number, row: Record<string, any>) => {
    const rowId = row[table.idFieldName];
    const lastValue = lastValuesById.get(rowId);
    let bg = lastBgById.get(rowId) ?? 'transparent';

    if (lastValue !== undefined && newValue !== lastValue) {
        if (newValue > lastValue) {
            bg = 'green';
        }
        else if (newValue < lastValue) {
            bg = 'red';
        }

        if (resetTimeoutsById.has(rowId)) clearTimeout(resetTimeoutsById.get(rowId));

        // Schedule background reset
        resetTimeoutsById.set(
            rowId,
            window.setTimeout(() => {
                lastBgById.set(rowId, 'transparent');
                resetTimeoutsById.delete(rowId);
            }, resetBgAfterMs)
        );
    }

    lastValuesById.set(rowId, newValue);
    lastBgById.set(rowId, bg);

    return `<div class="age-cell" style="
    background-color:${bg};
    padding: 4pt;
    ">${newValue}</div>`;
});
