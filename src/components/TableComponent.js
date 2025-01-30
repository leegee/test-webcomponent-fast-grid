class TableComponent extends HTMLElement {
    numberOfRowsVisible = 10;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.columns = [];
        this.rows = new Map();  // Store rows by ID
        this.lastReceivedData = null;
        this.updateRequested = false;

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

        this.ws = new WebSocket(this.getAttribute('websocket-url'));

        this.ws.addEventListener('open', () => {
            this.ws.send(JSON.stringify({ type: 'connection_ack', message: 'hello' }));
            console.log('WebSocket connected');
        });

        this.ws.addEventListener('message', (event) => {
            console.log('WebSocket message received', event.data);
            const newRows = JSON.parse(event.data);

            if (this.columns.length === 0 && newRows.length > 0) {
                this.initialiseTable(newRows);
            }

            newRows.forEach(row => this.rows.set(row.id, row));

            if (!this.updateRequested) {
                this.updateRequested = true;
                requestAnimationFrame(() => this.renderMessageToScreen(newRows));
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

    initialiseTable(dataArray) {
        // Set columns based on the first row of data
        this.columns = Object.keys(dataArray[0]).map(key => ({ name: key, key }));

        // Set the table headers
        const headerRow = document.createElement('tr');
        for (let i = 0; i < this.columns.length; i++) {
            const th = document.createElement('th');
            th.textContent = this.columns[i].name;
            headerRow.appendChild(th);
        }
        this.thead.appendChild(headerRow);

        // Set a data row template
        const rowElement = document.createElement('tr');
        for (let i = 0; i < this.columns.length; i++) {
            const td = document.createElement('td');
            td.dataset.key = this.columns[i].key;
            rowElement.appendChild(td);
        }

        // Add data rows
        for (let i = 0; i <= this.numberOfRowsVisible; i++) {
            const thisRowElement = rowElement.cloneNode(true);
            thisRowElement.dataset.id = i;
            this.tbody.appendChild(thisRowElement);
        }
    }

    renderMessageToScreen(newRows) {
        for (let i = 0; i < newRows.length; i++) {
            const rowData = newRows[i];
            let rowElement = this.tbody.querySelector(`[data-id="${rowData.id}"]`);

            if (!rowElement) {
                console.log('no row el for ', rowData.id);
            } else {
                this.updateRow(rowElement, rowData);
            }
        }

        this.updateRequested = false;
    }

    updateRow(rowElement, rowData) {
        this.columns.forEach(col => {
            const cell = rowElement.querySelector(`[data-key="${col.key}"]`);
            if (cell) {
                cell.textContent = rowData[col.key] || '';
            }
        });
    }
}

customElements.define('foo-table', TableComponent);
