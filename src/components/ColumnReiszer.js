export const ResizableMixin = (Base) =>
    class extends Base {
        connectedCallback() {
            if (this._resizerInitDone) return;
            this._resizerInitDone = true;
            console.log("[ResizableMixin] connectedCallback");

            const wait = () => {
                const root = this.shadowRoot;
                const table = root && root.querySelector('table');
                const thead = root && root.querySelector('thead');
                const tbody = root && root.querySelector('tbody');
                const headers = thead && thead.querySelectorAll('th');

                console.log("[ResizableMixin] wait check", {
                    hasTable: !!table,
                    hasThead: !!thead,
                    hasTbody: !!tbody,
                    headerCount: headers?.length
                });

                if (table && thead && tbody && headers && headers.length) {
                    table.style.tableLayout = table.style.tableLayout || 'fixed';

                    const widths = Array.from(headers).map(th => th.getBoundingClientRect().width);
                    console.log("[ResizableMixin] initial widths:", widths);

                    widths.forEach((w, i) => this._applyColumnWidth(i, w));

                    headers.forEach((th, i) => {
                        if (!th.querySelector('.resizer')) {
                            th.style.position = th.style.position || 'relative';

                            const handle = document.createElement('div');
                            handle.className = 'resizer';
                            Object.assign(handle.style, {
                                position: 'absolute',
                                right: '0',
                                top: '0',
                                width: '6px',
                                height: '100%',
                                cursor: 'col-resize',
                                userSelect: 'none',
                                touchAction: 'none',
                            });
                            th.appendChild(handle);

                            if (this.columns) {
                                const widths = Array.from(headers).map(th => th.getBoundingClientRect().width);
                                this.columns.forEach((col, i) => {
                                    col.width = col.width ?? widths[i];
                                    this._applyColumnWidth(i, col.width);
                                });
                            }

                            console.log(`[ResizableMixin] added resizer to column ${i}`);

                            handle.addEventListener('mousedown', (e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                console.log(`[ResizableMixin] mousedown on resizer ${i}`);
                                this._startResize(e, i);
                            });
                            handle.addEventListener('touchstart', (e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                const t = e.touches[0];
                                console.log(`[ResizableMixin] touchstart on resizer ${i}`);
                                this._startResize(t, i);
                            }, { passive: false });
                        }
                    });
                } else {
                    requestAnimationFrame(wait);
                }
            };
            requestAnimationFrame(wait);
        }

        _startResize(pointerEvent, colIndex) {
            const root = this.shadowRoot;
            const headers = root.querySelectorAll('th');
            const th = headers[colIndex];

            this._resizingColIndex = colIndex;
            this._resizeStartX = pointerEvent.clientX;
            this._resizeStartWidth = th.getBoundingClientRect().width;

            console.log(`[ResizableMixin] start resize col ${colIndex}`, {
                startX: this._resizeStartX,
                startWidth: this._resizeStartWidth
            });

            if (!this._onMove) {
                this._onMove = (e) => {
                    const p = e.touches ? e.touches[0] : e;
                    this._performResize(p.clientX);
                };
                this._onUp = () => {
                    console.log(`[ResizableMixin] stop resize col ${this._resizingColIndex}`);
                    document.removeEventListener('mousemove', this._onMove);
                    document.removeEventListener('mouseup', this._onUp);
                    document.removeEventListener('touchmove', this._onMove);
                    document.removeEventListener('touchend', this._onUp);
                    this._resizingColIndex = null;
                };
            }

            document.addEventListener('mousemove', this._onMove);
            document.addEventListener('mouseup', this._onUp);
            document.addEventListener('touchmove', this._onMove, { passive: false });
            document.addEventListener('touchend', this._onUp);
        }

        _performResize(clientX) {
            if (this._resizingColIndex == null) return;
            const delta = clientX - this._resizeStartX;
            const newWidth = Math.max(24, Math.round(this._resizeStartWidth + delta));

            console.log(`[ResizableMixin] resizing col ${this._resizingColIndex} -> ${newWidth}px`);

            // Use the proper width redistribution method
            this._resizeColumn(this._resizingColIndex, newWidth);
        }

        _resizeColumn(colIndex, newWidth) {
            console.log("Resizing column", colIndex, "to", newWidth);

            // Current widths
            const currentWidths = this.columns.map(c => c.width);
            const totalWidth = currentWidths.reduce((sum, w) => sum + w, 0);

            console.log("Current widths:", currentWidths, "Total:", totalWidth);

            // Clamp minimum width
            const minWidth = 50;
            newWidth = Math.max(minWidth, newWidth);

            // Compute delta
            const delta = newWidth - currentWidths[colIndex];
            console.log("Delta:", delta);

            // Update target column
            this.columns[colIndex].width = newWidth;

            // Redistribute delta to remaining columns
            const otherIndexes = this.columns.map((_, i) => i).filter(i => i !== colIndex);
            let remainingDelta = delta;

            for (const i of otherIndexes) {
                if (remainingDelta === 0) break;

                let adjust = Math.floor(remainingDelta / otherIndexes.length);
                if (i === otherIndexes[otherIndexes.length - 1]) {
                    // Give leftover to last adjusted col
                    adjust = remainingDelta;
                }

                const old = this.columns[i].width;
                const updated = Math.max(minWidth, old - adjust);
                const actualDelta = updated - old;

                this.columns[i].width = updated;
                remainingDelta -= actualDelta;
            }

            console.log("New widths:", this.columns.map(c => c.width));

            // Apply via colgroup
            this.columns.forEach((col, i) => {
                const colEl = this.shadowRoot.querySelector(`colgroup col:nth-child(${i + 1})`);
                if (colEl) {
                    colEl.style.width = col.width + "px";
                    console.log(`Applied col ${i}: ${col.width}px`);
                }
            });
        }


    };
