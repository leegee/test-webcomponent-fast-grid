class TableComponent extends HTMLElement {
    static SHADOW_ROOT_MODE = 'open';

    #numberOfRowsVisible = 20;
    #updateRequested = false;
    #ready = false;
    #columns = [];
    #rowCache = new Map();
    #sortedRows = [];  // New array to store sorted rows by 'id'

    constructor() {
        super();
        this.attachShadow({ mode: TableComponent.SHADOW_ROOT_MODE });
        this.shadowRoot.innerHTML = `
          <style>
            main {
              display: flex;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: var(--foo-cell-border, '1px solid grey');
              padding: var(--foo-cell-padding, '8pt');
              text-align: left;
            }
            #pager {
              writing-mode: vertical-lr;
            }
            #pager::-webkit-slider-runnable-track {
                background: var(--foo-pager-background, 'grey');
                width: 2pt;
            }
            #pager::-webkit-slider-thumb {
                margin-left: -0.5em;
                width: 1em;
            }
          </style>

          <main>
            <table>
              <thead></thead>
              <tbody></tbody>
            </table>
            <input id="pager" type="range" class="scrollbar" min="0" max="${this.#numberOfRowsVisible}" value="0" />
          </main>
        `;

        this.tbody = this.shadowRoot.querySelector('tbody');
        this.thead = this.shadowRoot.querySelector('thead');
        this.pager = this.shadowRoot.getElementById('pager');

        this.ws = new WebSocket(this.getAttribute('websocket-url'));
    }

    connectedCallback() {
        const numberOfRowsVisible = this.getAttribute('rows');
        if (Number(numberOfRowsVisible) > 0) {
            this.#numberOfRowsVisible = Number(numberOfRowsVisible);
            this.pager.max = this.#numberOfRowsVisible;
        }

        this.ws.addEventListener('open', async () => {
            this.ws.send(JSON.stringify({ type: 'connection_ack', message: 'hello' }));
            console.info('WebSocket connected');
        });

        this.ws.addEventListener('message', (event) => {
            const newRows = JSON.parse(event.data);

            if (!this.#ready && newRows.length > 0) {
                this.initialiseTable(newRows);
                this.#ready = true;
            }

            if (!this.#updateRequested) {
                this.#updateRequested = true;

                // Process new rows
                for (let i = 0; i < newRows.length; i++) {
                    const newRow = newRows[i];
                    const existingRowIndex = this.#sortedRows.findIndex(row => row.id === newRow.id);

                    if (existingRowIndex !== -1) {
                        // If the row exists in sortedRows, update it
                        this.#sortedRows[existingRowIndex] = newRow;
                    } else {
                        // If the row doesn't exist, add it to the sortedRows
                        this.#sortedRows.push(newRow);
                    }
                }

                // Sort rows after updating
                this.sortRows();

                requestAnimationFrame(() => this.renderMessageToScreen());
            }
        });

        this.ws.addEventListener('error', (err) => console.error('WebSocket error', err));
        this.ws.addEventListener('close', () => console.info('WebSocket connection closed'));

        this.pager.addEventListener('input', () => this.renderVisibleRows());
    }

    disconnectedCallback() {
        if (this.ws) {
            this.ws.close();
        }
    }

    initialiseTable(dataArray) {
        // Set columns based on the first row of data
        this.#columns = Object.keys(dataArray[0]).map(key => ({ name: key, key }));

        // Set the table headers
        const headerRow = document.createElement('tr');
        for (let i = 0; i < this.#columns.length; i++) {
            const th = document.createElement('th');
            th.textContent = this.#columns[i].name;
            headerRow.appendChild(th);
        }
        this.thead.appendChild(headerRow);

        // Set a data row template
        const rowElement = document.createElement('tr');
        for (let i = 0; i < this.#columns.length; i++) {
            const td = document.createElement('td');
            td.dataset.key = this.#columns[i].key;
            rowElement.appendChild(td);
        }

        // Add data rows
        for (let i = 1; i <= this.#numberOfRowsVisible; i++) {
            const thisRowElement = rowElement.cloneNode(true);
            thisRowElement.dataset.id = i;
            this.tbody.appendChild(thisRowElement);
        }
    }

    renderMessageToScreen() {
        this.renderVisibleRows();
        this.#updateRequested = false;
    }

    // expose
    sortRows() {
        this.#sortedRows.sort((a, b) => a.id - b.id);
    }

    renderVisibleRows() {
        const start = parseInt(this.pager.value, 10);

        const visibleRows = this.#sortedRows.slice(start, start + this.#numberOfRowsVisible);

        for (let rowIndex = 0; rowIndex < visibleRows.length; rowIndex++) {
            const rowData = visibleRows[rowIndex];
            const rowElement = this.tbody.querySelector(`[data-id="${rowIndex + 1}"]`);

            if (rowElement) {
                for (let colIndex = 0; colIndex < this.#columns.length; colIndex++) {
                    const col = this.#columns[colIndex];
                    const cell = rowElement.querySelector(`[data-key="${col.key}"]`);

                    // Update the cell content only if it has changed
                    if (cell && cell.textContent !== rowData[col.key]) {
                        cell.textContent = rowData[col.key] || '';
                    }
                }
            }
        }
    }

    updatePagerMax() {
        this.pager.max = Math.max(0, this.#sortedRows.length > this.#numberOfRowsVisible ? this.#sortedRows.length - this.#numberOfRowsVisible : 0);
        this.renderVisibleRows();
    }
}

customElements.define('foo-table', TableComponent);
