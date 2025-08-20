import { BenchmarkHelper } from "../BenchmarkHelper";
import { allowedColumnTypes, ColumnAttributes, ColumnType } from "./ColumnComponent";
import { tableCss } from "./tableCss";
// import { ResizableMixin } from "./ColumnReiszer.js";

export type ColumnCallback = (value: any, rowData: Record<string, any>, cell: HTMLTableCellElement) => string | void;

// export class TableComponent extends ResizableMixin(HTMLElement) {
export class TableComponent extends HTMLElement {
    static SHADOW_ROOT_MODE: ShadowRootMode = 'closed';
    #benchmarkHelper: BenchmarkHelper | undefined;
    #cachedCells: any[][] = [];
    columns: ColumnAttributes[] = [];
    #computedCells: any[][] = [];
    #computedCellsColumnCallbacks: ColumnCallback[] = [];
    idFieldName = 'id';
    #logElement: HTMLElement;
    #numberOfRowsVisible = 40;
    #pager: HTMLInputElement;
    #reconnectAttempts = 0;
    #minReconnectDelay = 1_000;
    #maxReconnectAttempts = 10;
    #maxReconnectDelay = 30_000;
    #rowElements: HTMLTableRowElement[] = [];
    #rowsByGuid = new Map();
    root;
    #sortedRows: any[] = [];
    #sortFieldName: string | undefined;
    #sortMultiplier = 1;
    #table: HTMLTableElement;
    #tbody: HTMLTableSectionElement;
    #thead: HTMLTableSectionElement;
    #updateRequested = false;
    #ws: WebSocket | undefined;

    #sortFunction: (a: any, b: any) => number = () => 0;

    static get observedAttributes() {
        return ['max-reconnect-attempts', 'min-reconnect-delay', 'max-reconnect-delay'];
    }

    constructor() {
        super();

        this.root = this.attachShadow({ mode: TableComponent.SHADOW_ROOT_MODE });

        this.root.adoptedStyleSheets = [tableCss];
        // NB tabIndex is required to make the element focusable for keyboard interaction
        this.root.innerHTML = `
          <section tabIndex=0>
            <table id="table" role="table" aria-live="polite">
              <thead id="thead" role="rowgroup"></thead>
              <tbody id="tbody" role="rowgroup"></tbody>
            </table>
            <input id="pager" type="range" min="0" max="${this.#numberOfRowsVisible}" value="0" aria-label="Table pager"/>
            <aside id="log" part="log" aria-live="assertive"/>
          </section>
        `;

        this.#table = this.root.getElementById('table') as HTMLTableElement;
        this.#thead = this.root.getElementById('thead') as HTMLTableSectionElement;
        this.#tbody = this.root.getElementById('tbody') as HTMLTableSectionElement;
        this.#pager = this.root.getElementById('pager') as HTMLInputElement;
        this.#logElement = this.root.getElementById('log') as HTMLElement;

        const maxAttempts = Number(this.getAttribute('max-reconnect-attempts'));
        if (!isNaN(maxAttempts)) this.#maxReconnectAttempts = maxAttempts;

        const minDelay = Number(this.getAttribute('min-reconnect-delay'));
        if (!isNaN(minDelay)) this.#minReconnectDelay = minDelay;

        const maxDelay = Number(this.getAttribute('max-reconnect-delay'));
        if (!isNaN(maxDelay)) this.#maxReconnectDelay = maxDelay;
    }

    attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
        const n = Number(newValue);
        if (isNaN(n)) return;

        switch (name) {
            case 'max-reconnect-attempts':
                this.#maxReconnectAttempts = n;
                break;
            case 'min-reconnect-delay':
                this.#minReconnectDelay = n;
                break;
            case 'max-reconnect-delay':
                this.#maxReconnectDelay = n;
                break;
        }
    }

    get maxReconnectAttempts() {
        return this.#maxReconnectAttempts;
    }
    set maxReconnectAttempts(val) {
        this.#maxReconnectAttempts = val;
        this.setAttribute('max-reconnect-attempts', String(val));
    }

    get minReconnectDelay() {
        return this.#minReconnectDelay;
    }
    set minReconnectDelay(val) {
        this.#minReconnectDelay = val;
        this.setAttribute('min-reconnect-delay', String(val));
    }

    get maxReconnectDelay() {
        return this.#maxReconnectDelay;
    }
    set maxReconnectDelay(val) {
        this.#maxReconnectDelay = val;
        this.setAttribute('max-reconnect-delay', String(val));
    }

    #connectWebSocket() {
        const url = this.getAttribute('websocket-url');
        if (!url) return;

        this.#ws = new WebSocket(url);

        this.#ws.addEventListener('open', () => {
            console.info('WebSocket connected');
            this.#ws!.send(JSON.stringify({ type: 'connection_ack', message: 'hello' }));
            this.#clearLog();
            this.#reconnectAttempts = 0;
        });

        this.#ws.addEventListener('message', (event) => {
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

        this.#ws.addEventListener('close', (ev) => {
            if (++this.#reconnectAttempts <= this.#maxReconnectAttempts) {
                const delay = Math.min(
                    this.#minReconnectDelay * 2 ** this.#reconnectAttempts,
                    this.#maxReconnectDelay
                );
                this.#logError(`WebSocket closed (code: ${ev.code}). Reconnecting in ${delay / 1000} seconds...`);
                setTimeout(() => this.#connectWebSocket(), delay);
            } else {
                this.#logError(`WebSocket closed (code: ${ev.code}). Max retries reached.`);
            }
        });

        this.#ws.addEventListener('error', (err) => {
            this.#logError('WebSocket error', { type: err.type, readyState: this.#ws!.readyState, url });
        });
    }

    #logError(...msg: any[]) {
        console.error(msg);
        const p = document.createElement('p');
        p.textContent = msg.length === 1 ? String(msg) : JSON.stringify(msg, null, 2);
        this.#logElement.appendChild(p);
        this.#logElement.scrollTop = this.#logElement.scrollHeight;
        this.#logElement.style.visibility = 'visible';
    }

    #clearLog() {
        this.#logElement.innerHTML = '';
        this.#logElement.style.visibility = 'hidden';
    }

    async connectedCallback() {
        const numberOfRowsVisible = this.getAttribute('rows');
        if (Number(numberOfRowsVisible) > 0) {
            this.#numberOfRowsVisible = Number(numberOfRowsVisible);
            this.#pager.max = String(this.#numberOfRowsVisible);
        }

        this.#initialiseTable();
        this.#setSortFunction();

        this.#thead.addEventListener('click', this.#columnHeaderClickHander.bind(this));
        this.#pager.addEventListener('input', () => this.#renderVisibleRows());

        const sectionElement = this.root.querySelector('section') as HTMLElement;

        sectionElement.addEventListener('wheel', (event) => {
            event.preventDefault();
            const direction = Math.sign(event.deltaY);
            this.#pager.value = String(
                Math.max(Number(this.#pager.min), Math.min(Number(this.#pager.max),
                    parseInt(this.#pager.value) + direction
                ))
            );
            this.#renderVisibleRows();
        });

        sectionElement.addEventListener('keydown', (event) => {
            let newValue = parseInt(this.#pager.value);
            switch (event.key) {
                case 'ArrowDown':
                    newValue++;
                    break;
                case 'ArrowUp':
                    newValue--;
                    break;
                case 'PageDown':
                    newValue += this.#numberOfRowsVisible;
                    break;
                case 'PageUp':
                    newValue -= this.#numberOfRowsVisible;
                    break;
                case 'Home':
                    newValue = parseInt(this.#pager.min);
                    break;
                case 'End':
                    newValue = parseInt(this.#pager.max);
                    break;
                default:
                    return; // Bail early
            }

            event.preventDefault();
            newValue = Math.max(Number(this.#pager.min), Math.min(Number(this.#pager.max), newValue));
            this.#pager.value = String(newValue);
            this.#renderVisibleRows();
        });


        if (this.getAttribute('benchmark') === 'true') {
            const { BenchmarkHelper } = await import('../BenchmarkHelper');
            this.#benchmarkHelper = new BenchmarkHelper();
            // this.#benchmarkHelper.startBenchmark(this.#ws);
            this.#benchmarkHelper.startBenchmark();
        }

        // if (super.connectedCallback) super.connectedCallback();

        this.#connectWebSocket();
    }

    disconnectedCallback() {
        if (this.#ws) {
            this.#ws.close();
        }
    }

    #initialiseTable() {
        // Set the column types based upon child elements: <foo-column name='ID' key='id' type='string'/>
        const columnElements = Array.from(this.querySelectorAll('foo-column'));

        this.columns = columnElements.map((colElem) => {
            const typeAttr = colElem.getAttribute('type');
            const type = allowedColumnTypes.includes(typeAttr as ColumnType) ? (typeAttr as ColumnType) : undefined;

            return {
                name: colElem.getAttribute('name') ?? undefined,
                key: colElem.getAttribute('key') ?? undefined,
                type,
            };
        });

        this.idFieldName = columnElements
            .filter(el => el.hasAttribute('is-guid'))
            .map(el => el.getAttribute('key'))[0] || this.idFieldName;

        this.#sortFieldName = this.idFieldName;

        const colgroup = document.createElement('colgroup');

        // Set the table headers
        const headerRow = document.createElement('tr');
        for (let i = 0; i < this.columns.length; i++) {
            const col = document.createElement('col');
            col.setAttribute('part', this.columns[i].key || 'NO_KEY');
            colgroup.appendChild(col);

            const th = document.createElement('th');
            th.dataset.id = this.columns[i].key;
            th.dataset.sortMultiplier = '1';
            th.textContent = this.columns[i].name || 'NO_NAME';
            th.setAttribute('role', 'columnheader');
            th.setAttribute('scope', 'col');
            headerRow.appendChild(th);
        }
        this.#table.appendChild(colgroup);
        this.#thead.appendChild(headerRow);

        // Set a data row template 
        const rowElement = document.createElement('tr');
        rowElement.setAttribute('part', 'row');
        rowElement.setAttribute('role', 'row');
        for (let colIndex = 0; colIndex < this.columns.length; colIndex++) {
            const td = document.createElement('td');
            td.dataset.key = this.columns[colIndex].key;
            td.setAttribute('part', 'cell');
            td.setAttribute('role', 'cell');
            td.setAttribute('aria-colindex', String(colIndex + 1));
            rowElement.appendChild(td);
        }

        // Add data rows using the template
        for (let rowIndex = 0; rowIndex < this.#numberOfRowsVisible; rowIndex++) {
            const thisRowElement = rowElement.cloneNode(true) as HTMLTableRowElement;
            thisRowElement.dataset.idx = String(rowIndex);
            rowElement.setAttribute('aria-rowindex', String(rowIndex + 1));
            this.#tbody.appendChild(thisRowElement);
            this.#rowElements.push(thisRowElement);
            // Potentially used by callbacks
            this.#computedCells[rowIndex] = [];
        }

        // A cache for fast access during rendering
        this.#cachedCells = [];
        for (let rowIndex = 0; rowIndex < this.#rowElements.length; rowIndex++) {
            const rowElement = this.#rowElements[rowIndex];
            const rowCells = [];
            for (let colIndex = 0; colIndex < this.columns.length; colIndex++) {
                const col = this.columns[colIndex];
                rowCells.push(rowElement.querySelector(`[data-key="${col.key}"]`));
            }
            this.#cachedCells.push(rowCells);
        }
    }

    #processNewData(newRows: any[]) {
        // Add new row data - this is the fastest form of loop
        for (let i = 0; i < newRows.length; i++) {
            // I suspect a numeric index would be faster than this named access?
            this.#rowsByGuid.set(newRows[i][this.idFieldName], newRows[i]);
        }

        this.#update();
    }

    #renderVisibleRows() {
        const start = parseInt(this.#pager.value, 10);
        const visibleRows = this.#sortedRows.slice(start, start + this.#numberOfRowsVisible);

        for (let rowIndex = 0; rowIndex < visibleRows.length; rowIndex++) {
            const rowData = visibleRows[rowIndex];

            if (this.#cachedCells[rowIndex]) {
                for (let colIndex = 0; colIndex < this.columns.length; colIndex++) {

                    // If the user specified a callback for this colum, use it:
                    if (this.#computedCellsColumnCallbacks[colIndex]) {

                        // If the value has changed:
                        const updatedContent = this.#computedCellsColumnCallbacks[colIndex](
                            rowData[this.columns[colIndex].key!],
                            rowData,
                            this.#cachedCells[rowIndex][colIndex]
                        );

                        if (updatedContent !== undefined &&
                            this.#computedCells[rowIndex][colIndex] !== updatedContent
                        ) {
                            this.#cachedCells[rowIndex][colIndex].innerHTML = updatedContent;
                            this.#computedCells[rowIndex][colIndex] = updatedContent; //sort
                        }

                    }

                    // No callback specified, render the raw data if it is diffrent to the cached value
                    else if (this.#cachedCells[rowIndex][colIndex]
                        && this.#cachedCells[rowIndex][colIndex].innerHTML !== rowData[this.columns[colIndex].key!]
                    ) {
                        this.#cachedCells[rowIndex][colIndex].innerHTML = rowData[this.columns[colIndex].key!] || '';
                    }
                }
            }
        }

        // It is faster to test than to call an empty/void method 
        if (this.#benchmarkHelper) {
            this.#benchmarkHelper.recordMessage();
        }
    }

    #update() {
        // Prepare for sort: faster than Array.from
        this.#sortedRows = [];
        for (let [, value] of this.#rowsByGuid) {
            this.#sortedRows.push(value);
        }

        this.#sortedRows.sort(this.#sortFunction);

        this.#pager.max = String(
            Math.max(0,
                this.#sortedRows.length > this.#numberOfRowsVisible ? this.#sortedRows.length - this.#numberOfRowsVisible : 0
            )
        );
        this.#renderVisibleRows();
    }

    #setSortFunction() {
        const sortColumn = this.columns.find(col => col.key === this.#sortFieldName);
        if (!sortColumn) {
            this.#logError(`Sort field '${this.#sortFieldName}' does not exist in column scheme:`, Object.keys(this.columns).join(', '));
            return;
        }

        const sortMultiplier = Number(this.#sortMultiplier);

        switch (sortColumn.type) {
            case 'string':
                this.#sortFunction = (a, b) =>
                    sortMultiplier * ('' + a[this.#sortFieldName!]).localeCompare('' + b[this.#sortFieldName!]);
                break;

            case 'number':
                this.#sortFunction = (a, b) =>
                    sortMultiplier * (Number(a[this.#sortFieldName!]) - Number(b[this.#sortFieldName!]));
                break;

            case 'date':
                this.#sortFunction = (a, b) =>
                    sortMultiplier * (new Date(a[this.#sortFieldName!]).getTime() - new Date(b[this.#sortFieldName!]).getTime());
                break;

            default:
                this.#logError('Unknown column type:', sortColumn.type);
        }
    }

    #columnHeaderClickHander(e: MouseEvent) {
        const eTarget = e.target as HTMLElement;
        if (!eTarget.dataset.id) return; // Only process 'th' - ignore resize handle

        if (eTarget.dataset.id === this.#sortFieldName) {
            // If clicking on a header a second time, toggle direction
            if (eTarget.dataset.sortMultiplier === '-1') {
                eTarget.classList.remove('desc');
                eTarget.dataset.sortMultiplier = '1';
                this.#sortMultiplier = 1;
            } else {
                eTarget.classList.add('desc');
                eTarget.dataset.sortMultiplier = '-1';
                this.#sortMultiplier = -1;
            }
        } else {
            this.#sortFieldName = eTarget.dataset.id;
        }
        this.#setSortFunction();
        this.#update();
    }

    registerColumnCallback(key: string, fn: ColumnCallback) {
        const colIndex = this.columns.findIndex(c => c.key === key);
        if (colIndex === -1) {
            throw new Error(`Column ${key} not found`);
        }
        this.#computedCellsColumnCallbacks[colIndex] = fn;
    }

    // _applyColumnWidth(index: number, width: number) {
    //     const colgroup = this.shadowRoot.querySelector("colgroup");
    //     if (!colgroup) return;

    //     const col = colgroup.children[index] as HTMLElement;
    //     if (col) {
    //         console.log(`Applying width ${width}px to col ${index}`);
    //         col.style.width = `${width}px`;
    //     }
    // }
}

customElements.define('foo-table', TableComponent);
