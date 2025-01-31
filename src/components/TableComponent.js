class TableComponent extends HTMLElement {
    static SHADOW_ROOT_MODE = 'open';

    #columns = [];
    #idFieldName = 'id';
    #sortFieldName = undefined;
    #numberOfRowsVisible = 20;
    #ready = false;
    #rowsByGuid = new Map();
    #rowElements = [];
    #sortedRows = [];
    #updateRequested = false;
    #benchmarkHelper = undefined;

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
                width: var(--foo-pager-width, '2pt');
            }
            #pager::-webkit-slider-thumb {
                margin-left: -0.5em;
                width: 1em;
            }
          </style>

          <main>
            <table>
              <thead id="thead"></thead>
              <tbody id="tbody"></tbody>
            </table>
            <input id="pager" type="range" min="0" max="${this.#numberOfRowsVisible}" value="0" />
          </main>
        `;

        this.thead = this.shadowRoot.getElementById('thead');
        this.tbody = this.shadowRoot.getElementById('tbody');
        this.pager = this.shadowRoot.getElementById('pager');

        this.ws = new WebSocket(this.getAttribute('websocket-url'));
    }

    async connectedCallback() {
        const numberOfRowsVisible = this.getAttribute('rows');
        if (Number(numberOfRowsVisible) > 0) {
            this.#numberOfRowsVisible = Number(numberOfRowsVisible);
            this.pager.max = this.#numberOfRowsVisible;
        }

        this.#idFieldName = this.getAttribute('guid-field') || this.#idFieldName;
        this.#sortFieldName = this.#idFieldName;

        this.ws.addEventListener('open', async () => {
            this.ws.send(JSON.stringify({ type: 'connection_ack', message: 'hello' }));
            console.info('WebSocket connected');
        });

        this.ws.addEventListener('message', (event) => {
            const newRows = JSON.parse(event.data);

            if (!this.#ready && newRows.length > 0) {
                this.#initialiseTable(newRows);
                this.#ready = true;
            }

            if (!this.#updateRequested) {
                this.#updateRequested = true;
                this.processNewData(newRows);

                requestAnimationFrame(() => {
                    this.#renderVisibleRows();
                    this.#updateRequested = false;
                });
            }
        });

        this.ws.addEventListener('error', (err) => console.error('WebSocket error', err));
        this.ws.addEventListener('close', () => console.info('WebSocket connection closed'));

        this.pager.addEventListener('input', () => this.#renderVisibleRows());

        if (this.getAttribute('benchmark') === 'true') {
            const { BenchmarkHelper } = await import('../BenchmarkHelper');
            this.#benchmarkHelper = new BenchmarkHelper();
            this.#benchmarkHelper.startBenchmark(this.ws);
        }
    }

    disconnectedCallback() {
        if (this.ws) {
            this.ws.close();
        }
    }

    #initialiseTable(dataArray) {
        // Set columns based on the first row of data
        this.#columns = Object.keys(dataArray[0]).map(key => ({ name: key, key }));

        if (!Object.keys(dataArray[0]).includes('id')) {
            console.error('The message did not contain the required GUID field, `' + this.#idFieldName + '`')
        }

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
        for (let i = 0; i < this.#numberOfRowsVisible; i++) {
            const thisRowElement = rowElement.cloneNode(true);
            thisRowElement.dataset.idx = i;
            this.tbody.appendChild(thisRowElement);
            this.#rowElements.push(thisRowElement);
        }
    }

    // Should allow a sort func as arg
    processNewData(newRows) {
        // Process new rows
        for (let i = 0; i < newRows.length; i++) {
            const newRow = newRows[i];
            const existingRow = this.#rowsByGuid.get(newRow[this.#idFieldName]);

            if (existingRow) {
                // If the row exists, update it
                this.#rowsByGuid.set(newRow[this.#idFieldName], newRow);
            } else {
                // If the row doesn't exist, add it
                this.#rowsByGuid.set(newRow[this.#idFieldName], newRow);
            }
        }

        // Sort rows
        // this.#sortedRows = Array.from(this.#rowsById.values()).sort((a, b) => a.id - b.id);
        this.#sortedRows = [];
        for (let [, value] of this.#rowsByGuid) {
            this.#sortedRows.push(value);
        }

        this.#sortedRows.sort(
            (a, b) => ('' + a[this.#sortFieldName]).localeCompare(b[this.#sortFieldName])
        );

        this.#updatePagerMax();
    }

    #renderVisibleRows() {
        const start = parseInt(this.pager.value, 10);

        const visibleRows = this.#sortedRows.slice(start, start + this.#numberOfRowsVisible);

        for (let rowIndex = 0; rowIndex < visibleRows.length; rowIndex++) {
            const rowData = visibleRows[rowIndex];

            if (this.#rowElements[rowIndex]) {
                for (let colIndex = 0; colIndex < this.#columns.length; colIndex++) {
                    const col = this.#columns[colIndex];
                    const cell = this.#rowElements[rowIndex].querySelector(`[data-key="${col.key}"]`);

                    if (cell && cell.textContent !== rowData[col.key]) {
                        cell.textContent = rowData[col.key] || '';
                    }
                }
            }
        }

        if (this.#benchmarkHelper) {
            this.#benchmarkHelper.recordMessage();
        }
    }

    #updatePagerMax() {
        this.pager.max = Math.max(0, this.#sortedRows.length > this.#numberOfRowsVisible ? this.#sortedRows.length - this.#numberOfRowsVisible : 0);
        this.#renderVisibleRows();
    }
}

customElements.define('foo-table', TableComponent);
