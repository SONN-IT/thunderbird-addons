(() => {
  // compose script
  browser.composeScripts.register({
    css: [],
    js: [
      {file: "compose.js"},
    ]
  });
})();