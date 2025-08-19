# Fast Data Table

## Synopsis

    <foo-table websocket-url="ws://localhost:8023" rows="10" guid-field="id" benchmark="true">
        <foo-column name="ID"       key="id"       type="string" is-guid="true"></foo-column>
        <foo-column name="Name"     key="name"     type="string"               ></foo-column>
        <foo-column name="Age"      key="age"      type="number"               ></foo-column>
        <foo-column name="Location" key="location" type="string"               ></foo-column>
    </foo-table>

## Test

    bun install
    bun run test

To test in a browser:

    # test ws server
    bun run test:server

    # Or test ws server - slow
    bun run test:server:slow

    # dev wc server
    bun dev

See [`index.html`](./index.html) for a complete example.

## Description

An experiment to create a vanilla Web Component that provides a window on websocket data that updates as quickly as possible, with legible code, but without the overhead of any of the wonderful frameworks that dominate the landscape.

Renders a table with a specific number of rows that acts as a movable data window on a set of data of unspecified size. Updates only the text content of those table cells if the data has changed.

Allows movement of the data window using a separate control: the table remains the same, the text content changes.

The current sorting and merging of data looks somewhat naive, but benchmarks show it to be faster
than using a binary search.

If the number of items in the subscription were predetermined, sorting would be unncessary and binary search 
for insertion points would be faster. However, the component is so fast as it stands....

## Out of Scope / Future Work

Change indicators would be useful. Perhaps allowing a column to specifiy that it ought to record changes
could cause a new column to be added to do just that; the specification would have to specify a time period
over which to monitor the change (ie up 10% over one minute/hour/day). 

## Options 

### Attributes

`websocket-url='{string}'` (required)

`max-reconnect-attempts` in milliseconds

`min-reconnect-delay` in milliseconds

`max-reconnect-delay` in milliseconds

`rows='{number}'` - number of rows to display, defaults to `20`.

`benchmark='true'` - log benchmarks to the console

### Public Methods

`registerColumnCallback(columnKey, callback(newCellValue, completeDataRow, cellElement)`

### Public Fields

Static `SHADOW_ROOT_MODE` - `open` or `closed`, defaults to `closed` but can bet set to `open` for testing.

### CSS Variables

    --foo-cell-border
    --foo-cell-padding
    --foo-pager-background
    --foo-pager-width
    --foo-cell-align

### Parts

    row
    cell
    log

Every column is also marked as a `part` using the column `key` property.

## Code Notes

* Since function calls are slow, a C-style for loop is the faster.
* Maps are fastest for look-ups.
* DOM manipulation is slow, so is minimized to rendering the table once and updating its contents

## Test

    bun run test

## Example

    bun run test:server
    bun run dev

## Benchmark

Supply a `benchmark='true'` attribute to see benchmarks in the console. These impact performance a little, but cannot
be run in a worker thread because workers do not have acess to the `performance.memory` API.

Sending between 1-50 messages every 10 ms for a dataset of 100 items, on my old 64GB i7 running Windoze 10, whilst the app isn't touched and I'm watching a video on PooTube:

    Received: 1000 messages in 8.99s
    Throughput: 111.25 messages/sec
    Heap Used: 11.29 MB
    Average FPS: 60.34

    Received: 2000 messages in 32.81s
    Throughput: 60.97 messages/sec
    Heap Used: 10.37 MB
    Average FPS: 60.17

    Received: 3000 messages in 41.16s
    Throughput: 72.89 messages/sec
    Heap Used: 10.21 MB
    Average FPS: 60.11

## Author 

Lee Goddard 29-31 January 2025
