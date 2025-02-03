class TableComponent extends HTMLElement {
    static SHADOW_ROOT_MODE = 'open';

    #columns = [];
    #idFieldName = 'id';
    #sortFieldName = undefined;
    #numberOfRowsVisible = 20;
    #rowsByGuid = new Map();
    #rowElements = [];
    #sortedRows = [];
    #updateRequested = false;
    #benchmarkHelper = undefined;
    #cachedCells = []; // Cache for cells

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
              text-align: var(--foo-cell-align, 'left');;
            }
            #pager {
              writing-mode: vertical-lr;
            }
            #pager::-webkit-slider-runnable-track {
                background: var(--foo-pager-background, 'grey');
                width: var(--foo-pager-width, '2pt');
            }
            #pager::-webkit-slider-thumb {
                // margin-left: -0.5em;
                // width: 1em;
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

        this.#initialiseTable();
        this.#idFieldName = this.getAttribute('guid-field') || this.#idFieldName;
        this.#sortFieldName = this.#idFieldName;

        this.ws.addEventListener('open', async () => {
            this.ws.send(JSON.stringify({ type: 'connection_ack', message: 'hello' }));
            console.info('WebSocket connected');
        });

        this.ws.addEventListener('message', (event) => {
            const newRows = JSON.parse(event.data);

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

    #initialiseTable() {
        const columnElements = Array.from(this.querySelectorAll('foo-column'));
        this.#columns = columnElements.map((colElem) => ({
            name: colElem.getAttribute('name'),
            key: colElem.getAttribute('key'),
            type: colElem.getAttribute('type'),
        }));

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

        this.#cachedCells = [];
        this.#rowElements.forEach((rowElement, rowIndex) => {
            const rowCells = [];
            this.#columns.forEach((col) => {
                rowCells.push(rowElement.querySelector(`[data-key="${col.key}"]`));
            });
            this.#cachedCells.push(rowCells);
        });
    }

    processNewData(newRows) {
        // Process new rows
        for (let i = 0; i < newRows.length; i++) {
            this.#rowsByGuid.set(newRows[i][this.#idFieldName], newRows[i]);
        }

        // Sort rows
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

            if (this.#cachedCells[rowIndex]) {
                for (let colIndex = 0; colIndex < this.#columns.length; colIndex++) {
                    if (this.#cachedCells[rowIndex][colIndex]
                        && this.#cachedCells[rowIndex][colIndex].textContent !== rowData[this.#columns[colIndex].key]) {
                        this.#cachedCells[rowIndex][colIndex].textContent = rowData[this.#columns[colIndex].key] || '';
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
