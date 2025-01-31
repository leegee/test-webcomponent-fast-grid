# Fast Data Table

An experiment to create a vanilla Web Component that provides a window on websocket data that updates as quickly as possible, with legible code.

Renders a table with a specific number of rows that acts as a movable data window on a set of data of unspecified size.

Updates the text content of the table cells if they change are within the visible range.

Conscously not included: 

- No protocol to specify columns and types
- No callbacks on changes
- No callbacks to sort

## Code Notes

Functional calls are slow, so a C-style for loop is the fastest, yet keeping some for legibility.

Maps are fast.

## Test

    bun run test

## Example

    bun run test:server
    bun run dev

## Author 

Lee Goddard 2025
