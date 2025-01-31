# Fast Data Table

An experiment to create a vanilla Web Component that provides a window on websocket data that updates as quickly as possible, with legible code.

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
