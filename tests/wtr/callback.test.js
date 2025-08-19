import { expect } from '@esm-bundle/chai';
import { fixture, html, waitUntil } from '@open-wc/testing';

import '../../src/components/TableComponent';
import { TableComponent } from '../../src/components/TableComponent';

let reset_bg_after_ms = 200;

function getPopulatedRows(root) {
    return [...root.querySelectorAll('tbody tr')]
        .filter(tr => [...tr.querySelectorAll('td')].some(td => td.textContent.trim() !== ''));
}

describe('FooTable WebSocket Data Handling', () => {
    let component;
    let mockWebSocket;
    let originalWebSocket;

    before(() => {
        TableComponent.SHADOW_ROOT_MODE = 'open';
    });

    beforeEach(async () => {
        originalWebSocket = globalThis.WebSocket;
        globalThis.WebSocket = class WebSocket {
            constructor() {
                this.listeners = {};
                mockWebSocket = this;
                this.readyState = 1; // OPEN
            }
            addEventListener(event, callback) { this.listeners[event] = callback; }
            close() { }
            send(data) {
                setTimeout(() => { if (this.listeners['message']) this.listeners['message']({ data }); }, 10);
            }
        };

        component = await fixture(html`
      <foo-table websocket-url="ws://localhost:8023">
        <foo-column name="ID" key="id" type="string"></foo-column>
        <foo-column name="Name" key="name" type="string"></foo-column>
        <foo-column name="Age" key="age" type="number"></foo-column>
        <foo-column name="Location" key="location" type="string"></foo-column>
      </foo-table>
    `);

        const lastValuesById = new Map();
        const resetTimeoutsById = new Map();
        const table = document.getElementsByTagName('foo-table')[0];

        table.registerColumnCallback('age', (newValue, row, cell) => {
            const rowId = row[table.idFieldName];
            const lastValue = lastValuesById.get(rowId);
            let bg = '';

            if (lastValue !== undefined && newValue !== lastValue) {
                if (newValue > lastValue) bg = 'green';
                else if (newValue < lastValue) bg = 'red';

                // Clear existing timeout if any
                if (resetTimeoutsById.has(rowId)) clearTimeout(resetTimeoutsById.get(rowId));

                // Apply new timeout to reset background
                resetTimeoutsById.set(rowId, setTimeout(() => {
                    if (cell.firstElementChild) cell.firstElementChild.style.backgroundColor = '';
                    resetTimeoutsById.delete(rowId);
                    console.log(`# Reset background for row ${rowId}`);
                }, reset_bg_after_ms));
            }

            lastValuesById.set(rowId, newValue);
            return bg ? `<div style="background-color:${bg}">${newValue}</div>` : String(newValue);
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

            // Wait for timeout to reset background
            await new Promise(r => setTimeout(r, reset_bg_after_ms + 50));

            ageDiv = ageCell.firstElementChild;
            expect(ageDiv.style.backgroundColor).to.equal('');
        });
    });
});
