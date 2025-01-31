/**
 * TODO: 
 * protocol to specify columns and types
 * 
 * NOTES
 * 
 * Functional calls are slow, so a C-style for loop is the fastest,
 * yet keeping some for legibility
 * 
 * Maps are fast.
 * 
 */

class TableComponent extends HTMLElement {
    static SHADOW_ROOT_MODE = 'open';

    #numberOfRowsVisible = 10;
    #updateRequested = false;
    #ready = false;
    #columns = [];
    #rows = new Map();

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
                requestAnimationFrame(() => this.renderMessageToScreen(newRows));
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

    renderMessageToScreen(newRows) {
        for (let i = 0; i < newRows.length; i++) {
            this.#rows.set(newRows[i].id, newRows[i]);
        }
        this.renderVisibleRows();
        this.#updateRequested = false;
    }

    renderVisibleRows() {
        const start = parseInt(this.pager.value, 10);

        for (let i = 1; i <= this.#numberOfRowsVisible; i++) {
            const rowData = this.#rows.get((start + i).toString());
            if (!rowData) {
                continue;
            }

            let rowElement = this.tbody.querySelector(`[data-id="${i}"]`);

            for (let i = 0; i < this.#columns.length; i++) {
                const col = this.#columns[i];
                const cell = rowElement.querySelector(`[data-key="${col.key}"]`);
                if (cell && cell.textContent !== rowData[col.key]) {
                    cell.textContent = rowData[col.key] || '';
                }
            }
        }
    }

    updatePagerMax() {
        this.pager.max = Math.max(0, this.#rows.size > this.#numberOfRowsVisible ? this.#rows.size - this.#numberOfRowsVisible : 0);
        this.renderVisibleRows();
    }
}

customElements.define('foo-table', TableComponent);
