export class ColumnComponent extends HTMLElement {
    name?: string;
    key?: string;
    type?: 'string' | 'number' | 'date';

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const nameAttr = this.getAttribute('name');
        const keyAttr = this.getAttribute('key');
        const typeAttr = this.getAttribute('type') as 'string' | 'number' | 'date' | null;

        this.shadowRoot!.innerHTML = `<slot></slot>`;

        this.name = nameAttr ?? undefined;
        this.key = keyAttr ?? undefined;
        this.type = typeAttr ?? undefined;
    }
}

export type ColumnAttributes = Pick<ColumnComponent, 'name' | 'key' | 'type'>;

export const allowedColumnTypes = ['string', 'number', 'date'] as const;
export type ColumnType = (typeof allowedColumnTypes)[number];

customElements.define('foo-column', ColumnComponent);
