self.onmessage = function (event) {
    let { newRows, rowsByGuid, idFieldName, sortFieldName } = event.data;

    rowsByGuid = new Map(Object.entries(rowsByGuid));

    for (let i = 0; i < newRows.length; i++) {
        rowsByGuid.set(newRows[i][idFieldName], newRows[i]);
    }

    self.postMessage({
        rowsByGuid: Object.fromEntries(rowsByGuid),
        sortedRows: Array.from(rowsByGuid.values()).sort(
            (a, b) => String(a[sortFieldName]).localeCompare(b[sortFieldName])
        )
    });
};
