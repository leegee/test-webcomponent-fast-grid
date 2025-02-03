class ColumnComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const name = this.getAttribute('name');
        const key = this.getAttribute('key');
        const type = this.getAttribute('type');

        this.shadowRoot.innerHTML = `<slot></slot>`;

        this.name = name;
        this.key = key;
        this.key = type;
    }
}

customElements.define('foo-column', ColumnComponent);

