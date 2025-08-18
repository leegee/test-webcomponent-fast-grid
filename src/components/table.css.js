export const tableStyles = new CSSStyleSheet();

await tableStyles.replace(`
  section {
    display: flex;
    position: relative;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    cursor: s-resize;
  }

  th::before {
    content: "▼ ";
    opacity: 50%;
    font-size: 75%;
  }

  th.desc {
    cursor: n-resize;
  }

  th.desc::before {
    content: "▲ ";
    opacity: 50%;
    font-size: 75%;
  }

  th,
  td {
    border: 1px solid grey;
    padding: 8pt;
    text-align: left;
  }

  #pager {
    writing-mode: vertical-lr;
  }

  #pager::-webkit-slider-runnable-track {
    background: grey;
    width: 2pt;
  }

  #pager::-webkit-slider-thumb {
    margin-left: -0.5em;
    width: 1em;
  }

  #log {
    visibility: hidden;
    position: absolute;  
    top: 50%;             
    left: 50%;            
    transform: translate(-50%, -50%); 
    max-width: 80%;     
    max-height: 80%; 
    overflow-y: auto;     
    font-family: monospace;
    background: darkred;
    color: #ddd;
    padding: 1em;
    z-index: 10;
    white-space: pre-wrap; 
  }
`);
