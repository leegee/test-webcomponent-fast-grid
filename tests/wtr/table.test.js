import { expect } from '@esm-bundle/chai';
import { fixture, html } from '@open-wc/testing';
import '../../src/components/TableComponent';

describe('FooTable WebSocket Data Handling', () => {
    let component;
    let mockWebSocket;
    let originalWebSocket;

    beforeEach(async () => {
        // Mock WebSocket
        originalWebSocket = globalThis.WebSocket; // Save original WebSocket
        globalThis.WebSocket = class {
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
                // Simulate a delayed response
                setTimeout(() => {
                    if (this.listeners['message']) {
                        this.listeners['message']({ data });
                    }
                }, 10);
            }
        };

        // Create the component
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

            // Send a fake WebSocket message
            const mockData = JSON.stringify([{ id: 1, name: 'Alice', age: 30, location: 'Paris' }]);
            mockWebSocket.send(mockData);

            // Wait for asynchronous updates
            await new Promise(resolve => setTimeout(resolve, 100)); // Explicit wait

            // Check if table updated
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
            // Initial row data
            const mockInitialData = JSON.stringify([{ id: 1, name: 'Alice', age: 30, location: 'Paris' }]);
            mockWebSocket.send(mockInitialData);

            // Wait for asynchronous updates
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check if table has 1 row
            let rows = component.shadowRoot.querySelectorAll('tbody tr');
            expect(rows).to.have.length(1);

            // Simulate an update with new data for the same row
            const mockUpdatedData = JSON.stringify([{ id: 1, name: 'Alice', age: 31, location: 'London' }]);
            mockWebSocket.send(mockUpdatedData);

            // Wait for the update
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check if table is updated
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
});
