async function init() {
  let SonnCss = await messenger.LegacyPrefs.getPref("extensions.sonn_css-template.css");
  if (SonnCss == null) {
    console.log("please setup pref extensions.sonn_css-template.css");
  } else {
    let prefs = {};
    prefs.css = SonnCss;
    await messenger.storage.local.set(prefs);
    console.log("background prefs: ", prefs);
  }

  // compose script
  browser.composeScripts.register({
    css: [],
    js: [
      {file: "compose.js"},
    ]
  });
}

init();