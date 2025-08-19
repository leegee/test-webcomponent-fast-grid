/**
 * This is just demo, all that is need to use the componetns is the impoort and markup
 */
import './components/TableComponent';
import './components/ColumnComponent';

const resetBgAfterMs = 10_000;
const lastValuesById = new Map<string, any>();
const resetTimeoutsById = new Map<string, number>();

const table = document.getElementsByTagName('foo-table')[0] as any;

table.registerColumnCallback('age', (newValue: number, row: Record<string, any>, cell: HTMLTableCellElement) => {
    const rowId = row[table.idFieldName];
    const lastValue = lastValuesById.get(rowId);
    let bg = '';

    if (lastValue !== undefined && newValue !== lastValue) {
        if (newValue > lastValue) bg = 'green';
        else if (newValue < lastValue) bg = 'red';

        // Clear existing timeout if any
        if (resetTimeoutsById.has(rowId)) clearTimeout(resetTimeoutsById.get(rowId));

        // Apply new timeout to reset background
        resetTimeoutsById.set(
            rowId,
            window.setTimeout(() => {
                if (cell.firstElementChild instanceof HTMLElement) {
                    cell.firstElementChild.style.backgroundColor = '';
                }
                resetTimeoutsById.delete(rowId);
                console.log(`# Reset background for row ${rowId}`);
            }, resetBgAfterMs)
        );
    }

    lastValuesById.set(rowId, newValue);

    return bg ? `<div style="background-color:${bg}">${newValue}</div>` : String(newValue);
});
