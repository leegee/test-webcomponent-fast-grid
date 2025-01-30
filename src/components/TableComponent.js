class TableComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.columns = [];
        this.rows = new Map();
        this.rowCache = new Map();
        this.lastReceivedData = null;
        this.updateRequested = false;
    }

    connectedCallback() {
        this.websocket_url = this.getAttribute('websocket-url');
        this.shadowRoot.innerHTML = `
          <style>
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid black;
              padding: 8px;
              text-align: left;
            }
          </style>
          <table>
            <thead></thead>
            <tbody></tbody>
          </table>
        `;

        this.tbody = this.shadowRoot.querySelector('tbody');
        this.thead = this.shadowRoot.querySelector('thead');

        this.ws = new WebSocket(this.websocket_url);

        // Could extend the protocol to specify required columns
        this.ws.addEventListener('open', () => {
            this.ws.send(JSON.stringify({ type: 'connection_ack', message: 'hello' }));
            console.log('WebSocket connected');
        });

        this.ws.addEventListener('message', (event) => {
            console.log('WebSocket message received', event.data);
            const newData = JSON.parse(event.data);

            // Set columns only the first time data is received
            if (this.columns.length === 0 && newData.length > 0) {
                this.setColumns(newData[0]);
            }

            // Only update if new data differs from last received data
            if (JSON.stringify(newData) !== this.lastReceivedData) {
                this.lastReceivedData = JSON.stringify(newData);
                this.queueUpdate(newData);
            } else {
                console.log('No new data, skipping update');
            }
        });

        this.ws.addEventListener('error', (err) => console.error('WebSocket error', err));

        this.ws.addEventListener('close', () => console.log('WebSocket connection closed'));
    }

    disconnectedCallback() {
        if (this.ws) {
            this.ws.close();
        }
    }

    setColumns(data) {
        // Dynamically set columns based on the first row of data
        const firstRow = data;
        this.columns = Object.keys(firstRow).map(key => ({ name: key, key }));

        // Set the table headers
        const headerRow = document.createElement('tr');
        for (let i = 0; i < this.columns.length; i++) {
            const col = this.columns[i];
            const th = document.createElement('th');
            th.textContent = col.name;
            headerRow.appendChild(th);
        }
        this.thead.appendChild(headerRow);
    }

    createRow(data) {
        console.log('Enter createRow with', data);
        const row = document.createElement('tr');
        for (let i = 0; i < this.columns.length; i++) {
            const col = this.columns[i];
            const cell = document.createElement('td');
            cell.textContent = data[col.key] || '';
            cell.dataset.key = col.key;
            row.appendChild(cell);
            console.log('Added column', cell);
        }
        return row;
    }

    queueUpdate(newData) {
        if (!this.updateRequested) {
            this.updateRequested = true;
            requestAnimationFrame(() => this.update(newData));
        }
    }

    update(dataArray) {
        console.log('Update with', dataArray);

        // Add or update rows in the Map
        for (let i = 0; i < dataArray.length; i++) {
            const newData = dataArray[i];
            // Update existing row
            if (this.rows.has(newData.id)) {
                console.log('Updating row with id', newData.id);
                this.rows.set(newData.id, newData);
            }
            // Add new row
            else {
                console.log('Adding new row with id', newData.id);
                this.rows.set(newData.id, newData);
            }
        }

        this.renderRows();
        this.updateRequested = false;
    }

    renderRows() {
        console.log('Rendering rows');
        const fragment = document.createDocumentFragment();

        // Add or update rows from the Map
        this.rows.forEach((rowData, id) => {
            const cachedRow = this.rowCache.get(id);

            if (cachedRow) {
                console.log(`Updating cached row with id: ${id}`);
                this.updateRow(cachedRow, rowData);
            } else {
                const newRow = this.createRow(rowData);
                newRow.dataset.id = id;
                this.rowCache.set(id, newRow);
                fragment.appendChild(newRow);
                console.log(`Adding new row with id: ${id}`);
            }
        });

        // Append new rows
        if (fragment.children.length > 0) {
            console.log('Appending new rows', fragment);
            this.tbody.appendChild(fragment);
        }
    }

    updateRow(rowElement, rowData) {
        console.log('Updating row');
        for (let i = 0; i < this.columns.length; i++) {
            const col = this.columns[i];
            const cell = rowElement.querySelector(`[data-key="${col.key}"]`);
            if (cell) {
                cell.textContent = rowData[col.key] || '';
            }
        }
    }
}

customElements.define('foo-table', TableComponent);
