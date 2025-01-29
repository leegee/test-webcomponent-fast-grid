import { expect } from '@esm-bundle/chai';
import { fixture, html, waitUntil } from '@open-wc/testing';

import '../../src/components/TableComponent';

describe('FooTable WebSocket Data Handling', () => {
    let component;
    let mockWebSocket;
    let originalWebSocket;

    beforeEach(async () => {
        // Mock WebSocket
        originalWebSocket = globalThis.WebSocket; // Save original WebSocket
        globalThis.WebSocket = class WebSocket {
            constructor() {
                this.listeners = {};
                mockWebSocket = this;
                this.readyState = 1; // OPEN
            }
            addEventListener(event, callback) {
                this.listeners[event] = callback;
            }
            close() { }
            send(data) {
                setTimeout(() => { // Simulate a delayed response
                    if (this.listeners['message']) {
                        this.listeners['message']({ data });
                    }
                }, 10);
            }
        };

        component = await fixture(html`<foo-table websocket-url="ws://localhost:8023"></foo-table>`);
    });

    afterEach(() => {
        // Restore the original WebSocket after each test
        globalThis.WebSocket = originalWebSocket;
    });

    describe('Initial WebSocket Data Handling', () => {
        it('should update table when WebSocket message is received', async () => {
            // Check that the table is initially empty
            expect(component.shadowRoot.querySelectorAll('tbody tr')).to.have.length(0);

            mockWebSocket.send(JSON.stringify([{
                id: 1, name: 'Alice', age: 30, location: 'Paris'
            }]));

            await waitUntil(() => component.shadowRoot.querySelectorAll('tbody tr').length > 0);

            const rows = component.shadowRoot.querySelectorAll('tbody tr');
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

            await waitUntil(() => component.shadowRoot.querySelectorAll('tbody tr').length > 0);

            let rows = component.shadowRoot.querySelectorAll('tbody tr');
            expect(rows).to.have.length(1);

            // Simulate an update with new data for the same row
            const mockUpdatedData = JSON.stringify([{ id: 1, name: 'Alice', age: 31, location: 'London' }]);
            mockWebSocket.send(mockUpdatedData);

            // Wait for the update to reflect in the table
            await waitUntil(() => {
                const updatedRows = component.shadowRoot.querySelectorAll('tbody tr');
                return updatedRows.length === 1 && updatedRows[0].querySelectorAll('td')[2].textContent === '31';
            });

            rows = component.shadowRoot.querySelectorAll('tbody tr');
            expect(rows).to.have.length(1);

            const cells = rows[0].querySelectorAll('td');
            expect(cells.length).to.equal(4);
            expect(cells[0].textContent).to.equal('1');
            expect(cells[1].textContent).to.equal('Alice');
            expect(cells[2].textContent).to.equal('31');
            expect(cells[3].textContent).to.equal('London');
        });
    });

    describe('Subsequent WebSocket Data Adds', () => {
        it('should add a row when new data is received', async () => {
            mockWebSocket.send(JSON.stringify([{
                id: 1, name: 'Alice', age: 30, location: 'Paris'
            }]));

            await waitUntil(() => component.shadowRoot.querySelectorAll('tbody tr').length > 0);

            let rows = component.shadowRoot.querySelectorAll('tbody tr');
            expect(rows).to.have.length(1);

            const newMockData = JSON.stringify([{ id: 2, name: 'Bob', age: 80, location: 'Berlin' }]);
            mockWebSocket.send(newMockData);

            // Wait for the new row to appear
            await waitUntil(() => component.shadowRoot.querySelectorAll('tbody tr').length === 2);

            rows = component.shadowRoot.querySelectorAll('tbody tr');
            expect(rows).to.have.length(2);

            const cells = rows[1].querySelectorAll('td');
            expect(cells.length).to.equal(4);
            expect(cells[0].textContent).to.equal('2');
            expect(cells[1].textContent).to.equal('Bob');
            expect(cells[2].textContent).to.equal('80');
            expect(cells[3].textContent).to.equal('Berlin');
        });
    });
});
