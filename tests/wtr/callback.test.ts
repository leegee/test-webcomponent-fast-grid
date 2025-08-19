import { expect } from '@esm-bundle/chai';
import { fixture, html, waitUntil } from '@open-wc/testing';

import '../../src/components/TableComponent';
import { TableComponent } from '../../src/components/TableComponent';
import { MockWebSocket, mockWebSocket } from '../MockWebSocket';

const resetBgAfterMs = 200;

function getPopulatedRows(root) {
    return [...root.querySelectorAll('tbody tr')]
        .filter(tr => [...tr.querySelectorAll('td')].some(td => td.textContent.trim() !== ''));
}

describe('FooTable WebSocket Data Handling', () => {
    let component;
    let originalWebSocket;

    before(() => {
        TableComponent.SHADOW_ROOT_MODE = 'open';
    });

    beforeEach(async () => {
        originalWebSocket = globalThis.WebSocket;
        globalThis.WebSocket = MockWebSocket as any;

        component = await fixture(html`
      <foo-table websocket-url="ws://localhost:8023">
        <foo-column name="ID" key="id" type="string"></foo-column>
        <foo-column name="Name" key="name" type="string"></foo-column>
        <foo-column name="Age" key="age" type="number"></foo-column>
        <foo-column name="Location" key="location" type="string"></foo-column>
      </foo-table>
    `);

        const table = document.getElementsByTagName('foo-table')[0] as any;

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

            return `<div class="age-cell" style=" background-color:${bg}; padding: 4pt; ">${newValue}</div>`;
        });

    });

    afterEach(() => { globalThis.WebSocket = originalWebSocket; });

    describe('Row callback', () => {
        it('should highlight age cell green when value increases, then reset after timeout', async () => {
            mockWebSocket.send(JSON.stringify([{ id: 1, name: 'Alice', age: 30, location: 'Paris' }]));
            await waitUntil(() => getPopulatedRows(component.shadowRoot).length > 0);

            let row = getPopulatedRows(component.shadowRoot)[0];
            let ageCell = row.querySelectorAll('td')[2];
            let ageDiv = ageCell.firstElementChild;

            expect(ageDiv ? ageDiv.textContent : ageCell.textContent).to.equal('30');

            mockWebSocket.send(JSON.stringify([{ id: 1, name: 'Alice', age: 31, location: 'Paris' }]));
            await waitUntil(() => {
                ageDiv = ageCell.firstElementChild;
                return ageDiv && ageDiv.textContent.includes('31') && ageDiv.style.backgroundColor === 'green';
            });
            expect(ageDiv.style.backgroundColor).to.equal('green');

            await new Promise(r => setTimeout(r, resetBgAfterMs + 150));
            mockWebSocket.send(JSON.stringify([{ id: 2, name: 'Whateer', age: 1, location: 'Nowhere' }]));

            await waitUntil(() => {
                ageDiv = ageCell.firstElementChild;
                return ageDiv && ageDiv.textContent.includes('31') && ageDiv.style.backgroundColor === 'transparent';
            });
            expect(ageDiv.style.backgroundColor).to.equal('transparent');
        });
    });
});
