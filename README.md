# Fast Data Table

An experiment to create a vanilla Web Component that provides a window on websocket data that updates as quickly as possible, with legible code.

Renders a table with a specific number of rows that acts as a movable data window on a set of data of unspecified size.

Updates only the text content of those table cells, if the data has changed.

Allows movement of the data window using a separate control: the table remains the same, the text content changes.

## Conscously Not Included

- No protocol to specify column names and types
- No callbacks to sort
- No callbacks on changes

## Options 

### Attributes

`websocket-url='{string}'` (required)

`rows='{number}'` - number of rows to display, defaults to `20`.

`guid-field='{string}'` - used to identify rows, defaults to `id`.

`benchmark='true'` - log benchmarks to the console

### Public Fields

`SHADOW_ROOT_MODE` - open or closed, defaults to `open` for testing.

### CSS Variables

    --foo-cell-border
    --foo-cell-padding
    --foo-pager-background
    --foo-pager-width
    --foo-cell-align

## Code Notes

* Since function calls are slow, a C-style for loop is the faster.
* Maps are fastest for look-ups.

## Test

    bun run test

## Example

    bun run test:server
    bun run dev

## Benchmark

Supply a `benchmark='true'` attribute.

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
