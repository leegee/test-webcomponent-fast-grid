import { expect } from '@esm-bundle/chai';
import { fixture, html, waitUntil } from '@open-wc/testing';

import '../../src/components/TableComponent';
import { TableComponent } from '../../src/components/TableComponent';
import { mockWebSocket, MockWebSocket } from '../MockWebSocket';

type RowType = {
    id: string;
    name: string;
    location: string;
}

function getPopulatedRows(root) {
    // console.log(root.innerHTML);
    return [...root.querySelectorAll('tbody tr')]
        .filter(tr => [...tr.querySelectorAll('td')]
            .some(td => td.textContent.trim() !== '')
        );
}

describe('FooTable WebSocket Data Handling', () => {
    let component;
    let originalWebSocket;

    before(() => {
        TableComponent.SHADOW_ROOT_MODE = 'open';
    });

    beforeEach(async () => {
        // Mock WebSocket
        originalWebSocket = globalThis.WebSocket; // Save original WebSocket
        globalThis.WebSocket = MockWebSocket as any;
        component = await fixture(html`
            <foo-table websocket-url="ws://localhost:8023">
                <foo-column name="ID" key="id" type="string"></foo-column>
                <foo-column name="Name" key="name" type="string"></foo-column>
                <foo-column name="Age" key="age" type="number"></foo-column>
                <foo-column name="Location" key="location" type="string"></foo-column>
            </foo-table>
        `);
    });

    afterEach(() => {
        globalThis.WebSocket = originalWebSocket;
    });

    describe('Initial WebSocket Data Handling', () => {
        it('should update table when WebSocket message is received', async () => {
            expect(getPopulatedRows(component.shadowRoot)).to.have.length(0);

            mockWebSocket.send(JSON.stringify([{
                id: 1, name: 'Alice', age: 30, location: 'Paris'
            }]));

            await waitUntil(
                () => getPopulatedRows(component.shadowRoot).length > 0
            );

            const rows = getPopulatedRows(component.shadowRoot);
            expect(rows).to.have.length(1);

            const cells = rows[0].querySelectorAll('td');
            expect(cells.length).to.equal(4);
            expect(cells[0].textContent).to.equal('1');
            expect(cells[1].textContent).to.equal('Alice');
            expect(cells[2].textContent).to.equal('30');
            expect(cells[3].textContent).to.equal('Paris');
        });
    });

    describe('Subsequent WebSocket Data Updates', () => {
        it('should update existing row when new data for the same ID is received', async () => {
            mockWebSocket.send(JSON.stringify([{
                id: 1, name: 'Alice', age: 30, location: 'Paris'
            }]));

            await waitUntil(() => getPopulatedRows(component.shadowRoot).length > 0);

            let rows = getPopulatedRows(component.shadowRoot);
            expect(rows).to.have.length(1);

            mockWebSocket.send(JSON.stringify([{ id: 1, name: 'Alice', age: 31, location: 'London' }]));

            // Wait for the update to reflect in the table
            await waitUntil(() => {
                const updatedRows = getPopulatedRows(component.shadowRoot);
                return updatedRows.length > 0 && updatedRows[0].querySelectorAll('td')[2].textContent === '31';
            });

            rows = getPopulatedRows(component.shadowRoot);
            expect(rows).to.have.length(1);

            const cells = rows[0].querySelectorAll('td');
            expect(cells.length).to.equal(4);
            expect(cells[0].textContent).to.equal('1');
            expect(cells[1].textContent).to.equal('Alice');
            expect(cells[2].textContent).to.equal('31');
            expect(cells[3].textContent).to.equal('London');
        });

        it('should add a row', async () => {
            mockWebSocket.send(JSON.stringify([{
                id: 1, name: 'Alice', age: 30, location: 'Paris'
            }]));

            await waitUntil(() => getPopulatedRows(component.shadowRoot).length > 0);

            let rows = getPopulatedRows(component.shadowRoot);
            expect(rows).to.have.length(1);

            mockWebSocket.send(JSON.stringify([{
                id: 2, name: 'Bob', age: 80, location: 'Berlin'
            }]));

            await waitUntil(() => getPopulatedRows(component.shadowRoot).length === 2);

            rows = getPopulatedRows(component.shadowRoot);
            expect(rows).to.have.length(2);

            const cells = rows[1].querySelectorAll('td');
            expect(cells.length).to.equal(4);
            expect(cells[0].textContent).to.equal('2');
            expect(cells[1].textContent).to.equal('Bob');
            expect(cells[2].textContent).to.equal('80');
            expect(cells[3].textContent).to.equal('Berlin');
        });

        it('should add two rows', async () => {
            mockWebSocket.send(JSON.stringify([{
                id: 1, name: 'Alice', age: 30, location: 'Paris'
            }]));

            await waitUntil(() => getPopulatedRows(component.shadowRoot).length > 0);

            let rows = getPopulatedRows(component.shadowRoot);
            expect(rows).to.have.length(1);

            mockWebSocket.send(JSON.stringify([
                { id: 2, name: 'Bob', age: 80, location: 'Berlin' },
                { id: 3, name: 'Charlie', age: 3, location: 'Budapest' },
            ]));

            await waitUntil(() => getPopulatedRows(component.shadowRoot).length === 3);

            rows = getPopulatedRows(component.shadowRoot);
            expect(rows).to.have.length(3);

            const cells = rows[2].querySelectorAll('td');
            expect(cells.length).to.equal(4);
            expect(cells[0].textContent).to.equal('3');
            expect(cells[1].textContent).to.equal('Charlie');
            expect(cells[2].textContent).to.equal('3');
            expect(cells[3].textContent).to.equal('Budapest');
        });

        it('should add many rows', async () => {
            const rowsToAdd = 100;
            let mockData: RowType[] = [];
            for (let id = 0; id < rowsToAdd; id++) {
                mockData.push(
                    { id: id.toString(), name: id + ' person', age: 21 + id, location: 'Place ' + id } as RowType,
                );
            }
            mockWebSocket.send(JSON.stringify(mockData));

            await waitUntil(() => getPopulatedRows(component.shadowRoot).length > 1);

            const rows = getPopulatedRows(component.shadowRoot);
            expect(rows).to.have.length.lessThan(rowsToAdd);

            const id = 0;
            const cells = rows[id].querySelectorAll('td');
            expect(cells.length).to.equal(4);
            expect(cells[0].textContent).to.equal(id.toString());
            expect(cells[1].textContent).to.equal(id + ' person');
            expect(cells[2].textContent).to.equal((21 + id).toString());
            expect(cells[3].textContent).to.equal('Place ' + id);
        });
    });

});
