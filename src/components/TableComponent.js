import { tableStyles } from "./table.css.js";
export class TableComponent extends HTMLElement {
    static SHADOW_ROOT_MODE = 'closed';
    #shadowRoot;
    #logElement;
    #benchmarkHelper = undefined;
    #cachedCells = [];
    #columns = [];
    #computedCells = [];
    #computedCellsColumnCallbacks = [];
    #idFieldName = 'id';
    #numberOfRowsVisible = 20;
    #rowElements = [];
    #rowsByGuid = new Map();
    #sortMultiplier = 1;
    #sortedRows = [];
    #sortFieldName = undefined;
    #sortFunction = () => void (0);
    #updateRequested = false;
    #table = undefined;
    #tbody = undefined;
    #thead = undefined;

    constructor() {
        super();

        this.#shadowRoot = this.attachShadow({ mode: TableComponent.SHADOW_ROOT_MODE });

        this.#shadowRoot.adoptedStyleSheets = [tableStyles];
        this.#shadowRoot.innerHTML = `
          <section>
            <table id="table">
              <thead id="thead"></thead>
              <tbody id="tbody"></tbody>
            </table>
            <input id="pager" type="range" min="0" max="${this.#numberOfRowsVisible}" value="0" />
            <aside id="log" part="log"/>
          </section>
        `;

        this.#table = this.#shadowRoot.getElementById('table');
        this.#thead = this.#shadowRoot.getElementById('thead');
        this.#tbody = this.#shadowRoot.getElementById('tbody');
        this.pager = this.#shadowRoot.getElementById('pager');
        this.#logElement = this.#shadowRoot.getElementById('log');

        this.ws = new WebSocket(this.getAttribute('websocket-url'));
    }

    #logError(...msg) {
        console.error(msg);
        const p = document.createElement('p');
        p.textContent = msg.length === 1 ? msg : JSON.stringify(msg, null, 2);
        this.#logElement.appendChild(p);
        this.#logElement.scrollTop = this.#logElement.scrollHeight;
        this.#logElement.style.visibility = 'visible';
    }

    async connectedCallback() {
        const numberOfRowsVisible = this.getAttribute('rows');
        if (Number(numberOfRowsVisible) > 0) {
            this.#numberOfRowsVisible = Number(numberOfRowsVisible);
            this.pager.max = this.#numberOfRowsVisible;
        }

        this.#initialiseTable();
        this.#setSortFunction();

        this.#thead.addEventListener('click', this.#columnHeaderClickHander.bind(this));

        this.ws.addEventListener('open', async () => {
            this.ws.send(JSON.stringify({ type: 'connection_ack', message: 'hello' }));
            console.info('WebSocket connected');
        });

        this.ws.addEventListener('message', (event) => {
            const newRows = JSON.parse(event.data);

            if (!this.#updateRequested) {
                this.#updateRequested = true;
                this.#processNewData(newRows);

                requestAnimationFrame(() => {
                    this.#renderVisibleRows();
                    this.#updateRequested = false;
                });
            }
        });

        this.ws.addEventListener('close', () => console.info('WebSocket connection closed'));

        this.ws.addEventListener('error', (err) => {
            this.#logError('WebSocket error', {
                type: err.type,
                readyState: this.ws.readyState,
                url: this.ws.url
            });
        });

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
        // Set the column types based upon child elements: <foo-column name='ID' key='id' type='string'/>
        const columnElements = Array.from(this.querySelectorAll('foo-column'));
        this.#columns = columnElements.map((colElem) => ({
            name: colElem.getAttribute('name'),
            key: colElem.getAttribute('key'),
            type: colElem.getAttribute('type'),
        }));

        this.#idFieldName = columnElements
            .filter(el => el.hasAttribute('is-guid'))
            .map(el => el.getAttribute('id'))[0] || this.#idFieldName;

        this.#sortFieldName = this.#idFieldName;

        // Create colgruop
        const colgroup = document.createElement('colgroup');

        // Set the table headers
        const headerRow = document.createElement('tr');
        for (let i = 0; i < this.#columns.length; i++) {
            const col = document.createElement('col');
            col.part = this.#columns[i].key;
            colgroup.appendChild(col);

            const th = document.createElement('th');
            th.dataset.id = this.#columns[i].key;
            th.dataset.sortMultiplier = '1';
            th.textContent = this.#columns[i].name;
            headerRow.appendChild(th);
        }
        this.#table.appendChild(colgroup);
        this.#thead.appendChild(headerRow);

        // Set a data row template
        const rowElement = document.createElement('tr');
        rowElement.setAttribute('part', 'row');
        for (let i = 0; i < this.#columns.length; i++) {
            const td = document.createElement('td');
            td.dataset.key = this.#columns[i].key;
            td.part = 'cell';
            rowElement.appendChild(td);
        }

        // Add data rows
        for (let i = 0; i < this.#numberOfRowsVisible; i++) {
            const thisRowElement = rowElement.cloneNode(true);
            thisRowElement.dataset.idx = i;
            this.#tbody.appendChild(thisRowElement);
            this.#rowElements.push(thisRowElement);
            // Potentially used by callbacks
            this.#computedCells[i] = [];
        }

        this.#cachedCells = [];
        for (let rowIndex = 0; rowIndex < this.#rowElements.length; rowIndex++) {
            const rowElement = this.#rowElements[rowIndex];
            const rowCells = [];
            for (let colIndex = 0; colIndex < this.#columns.length; colIndex++) {
                const col = this.#columns[colIndex];
                rowCells.push(rowElement.querySelector(`[data-key="${col.key}"]`));
            }
            this.#cachedCells.push(rowCells);
        }
    }

    #processNewData(newRows) {
        // Process new rows
        for (let i = 0; i < newRows.length; i++) {
            this.#rowsByGuid.set(newRows[i][this.#idFieldName], newRows[i]);
        }

        // Prepare for sort: faster than Array.from
        this.#sortedRows = [];
        for (let [, value] of this.#rowsByGuid) {
            this.#sortedRows.push(value);
        }

        // Sort rows
        this.#sortedRows.sort(this.#sortFunction);

        this.#update();
    }

    #renderVisibleRows() {
        const start = parseInt(this.pager.value, 10);
        const visibleRows = this.#sortedRows.slice(start, start + this.#numberOfRowsVisible);

        for (let rowIndex = 0; rowIndex < visibleRows.length; rowIndex++) {
            const rowData = visibleRows[rowIndex];

            if (this.#cachedCells[rowIndex]) {
                for (let colIndex = 0; colIndex < this.#columns.length; colIndex++) {
                    if (this.#computedCellsColumnCallbacks[colIndex]) {
                        this.#computedCells[rowIndex][colIndex] = this.#computedCellsColumnCallbacks[colIndex](
                            rowData[this.#columns[colIndex].key],
                            rowData,
                            this.#cachedCells[rowIndex][colIndex]
                        );
                        // Only render changed values
                        if (this.#computedCells[rowIndex][colIndex] !== rowData[this.#columns[colIndex].key]) {
                            this.#cachedCells[rowIndex][colIndex].textContent = this.#computedCells[rowIndex][colIndex];
                        }
                    }
                    else if (this.#cachedCells[rowIndex][colIndex]
                        // Only render changed values
                        && this.#cachedCells[rowIndex][colIndex].textContent !== rowData[this.#columns[colIndex].key]
                    ) {
                        this.#cachedCells[rowIndex][colIndex].textContent = rowData[this.#columns[colIndex].key] || '';
                    }
                }
            }
        }

        if (this.#benchmarkHelper) {
            this.#benchmarkHelper.recordMessage();
        }
    }

    #update() {
        this.pager.max = Math.max(0, this.#sortedRows.length > this.#numberOfRowsVisible ? this.#sortedRows.length - this.#numberOfRowsVisible : 0);
        this.#renderVisibleRows();
    }

    #setSortFunction() {
        const sortColumn = this.#columns.find(col => col.key === this.#sortFieldName);
        if (!sortColumn) {
            this.#logError(`Sort field '${this.#sortFieldName}' does not exist in column scheme:`, Object.keys(this.#columns).join(', '));
            return;
        }

        const sortMultiplier = Number(this.#sortMultiplier);

        switch (sortColumn.type) {
            case 'string':
                this.#sortFunction = (a, b) =>
                    sortMultiplier * ('' + a[this.#sortFieldName]).localeCompare('' + b[this.#sortFieldName]);
                break;

            case 'number':
                this.#sortFunction = (a, b) =>
                    sortMultiplier * (Number(a[this.#sortFieldName]) - Number(b[this.#sortFieldName]));
                break;

            case 'date':
                this.#sortFunction = (a, b) =>
                    sortMultiplier * (new Date(a[this.#sortFieldName]) - new Date(b[this.#sortFieldName]));
                break;

            default:
                this.#logError('Unknown type:', sortColumn.type);
        }
    }

    #columnHeaderClickHander(e) {
        if (this.#sortFieldName === e.target.dataset.id) {
            // If clicking on a header a second time, toggle direction
            if (e.target.dataset.sortMultiplier === '-1') {
                e.target.classList.remove('desc');
                e.target.dataset.sortMultiplier = '1';
                this.#sortMultiplier = 1;
            } else {
                e.target.classList.add('desc');
                e.target.dataset.sortMultiplier = '-1';
                this.#sortMultiplier = -1;
            }
        } else {
            this.#sortFieldName = e.target.dataset.id;
        }
        this.#setSortFunction();
        this.#update();
    }

    registerColumnCallback(index, fn) {
        this.#computedCellsColumnCallbacks[index] = fn;
    }
}

customElements.define('foo-table', TableComponent);
