async function composeInit() {
    let hs = document.querySelector('style');
    console.log("hs: ", hs);
    if (hs && hs.textContent.includes(".sonn-css")) {
        console.log("delete .sonn-css");
        hs.parentNode.removeChild(hs);
    } else {
        console.log("NO delete .sonn-css");
    }

    let prefs = await messenger.storage.local.get({
        SonnCss: [],
    });
    console.log("settings: ", prefs);

    if (prefs.SonnCss === "") {
        prefs.SonnCss = "font-family: Calibri, Carlito, Arial, Sans-Serif !important; font-size: 20px !important; " +
                        "background-color: #fff !important; color: #6495ED !important;`";
    }
    console.log("prefs.SonnCss: ", prefs.SonnCss);

    prefs.SonnCss = ' '.repeat(15) + prefs.SonnCss.split(";").join(";\n" + ' '.repeat(14));
    console.log("document: ", document);

    let cssStyle = "body,p,li,td,th,pre,h1,h2,h3,h4,h5,h6,address,sub," +
                   "sup,cite,abbr,acronym,code,samp,var,tt,.sonn-css {\n";

    // .slice to get rid of 4 whitespaces
    cssStyle = "\n" + ' '.repeat(10) + cssStyle + prefs.SonnCss.slice(0, -4) + "}\n" + ' '.repeat(4);

    let style = document.createElement('style');
    style.textContent = cssStyle;
    document.head.appendChild(style);
    document.body.classList.add("sonn-css");
}

composeInit();