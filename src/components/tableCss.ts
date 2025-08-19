export const tableCss = new CSSStyleSheet();

tableCss.replaceSync(`
  section {
    display: flex;
    position: relative;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  th {
    cursor: s-resize;
    padding: 1em;
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
    padding: 0.3em;
    border: 1px solid #555;
    text-align: left;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
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
