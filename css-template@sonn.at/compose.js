function updateCSSblock(node, id) {
    for (let i = 0 ; i < node.childNodes.length; i++) {
        const styleNode = node.childNodes[i];
        if (styleNode.nodeName=='STYLE') {
            let newContent = '';
            const rules = styleNode.sheet.cssRules;
            for(let r = 0; r < rules.length; r++)
                try { //some rules are more complex (@fontXX, @import), so there will be exteption. so just ignore this exception
                    newContent = newContent + id + ' ' //add ID before first selector
                        + rules[r].selectorText
                            .replace(/body/igm, '') //clear 'body' selector
                            .replace(id, ' ') //clear existing 'id' selectors, to avoid double 'id' selector
                            .replace(/,/igm, ",\n" + id) //add 'id' selector before any additional selector.
                        + ' { ' + rules[r].style.cssText + " }\n";
                } catch (e) { }
            styleNode.textContent = newContent;
        }
        if (node.hasChildNodes() && (node.nodeName != 'BLOCKQUOTE')) //do not steep into "BLOCKQUOTE".
            updateCSSblock(styleNode, id);
    }
}

async function insertCSS() {
    console.log("function insertCSS: adding sonn-css style")
    prefs = await messenger.storage.local.get({
        css: [],
    });
    let SonnCss = prefs.css;
    if (SonnCss == null) {
        console.log("ERROR: SonnCss not set");
        return
    }
    console.log("cfg settings: ", SonnCss);

    SonnCss = ' '.repeat(15) + SonnCss.split(";").join(";\n" + ' '.repeat(14));
    console.log("document: ", document);

    let cssStyle = "body,p,li,td,th,pre,h1,h2,h3,h4,h5,h6,address,sub," +
        "sup,cite,abbr,acronym,code,samp,var,tt,.sonn-css {\n";

    // .slice to get rid of 4 whitespaces
    cssStyle = "\n" + ' '.repeat(10) + cssStyle + SonnCss.slice(0, -4) + "}\n" + ' '.repeat(4);

    let style = document.createElement('style');
    style.textContent = cssStyle;
    document.head.appendChild(style);
    document.body.classList.add("sonn-css");
}

async function composeInit() {
    console.log("Document: ", document);
    let nodes = document.childNodes;
    for (let i = 0 ; i < nodes.length; i++) {
        const node = nodes[i];
        let id = '';
        console.log("node.nodeName: ", node.nodeName);
    }
    console.log("innerHTML ", document.firstChild.innerHTML);
    let blockq = document.querySelector('blockquote');

    if(blockq) {
        let id;
        if(blockq.cite) {
            id = blockq.cite;
        } else {
            id = 'Cite_' + Math.floor((Math.random() * 10000000));
        }
        id = id.replace(/\W/g, '_')
        blockq.setAttribute('id', id);
        id = '#' + id; //make CSS selector
        updateCSSblock(blockq, id);
        blockq.classList.add('cite'); //set class, to allow CSS styling for incompatible MS MUA
    }

    let styleNode = document.querySelector('style');
    // TODO docHead only for testing purpose
    let docHead = document.head.innerHTML;
    console.log("docHead: ", docHead);
    console.log("styleNode: ", styleNode);
    if(styleNode == null) {
        console.log("styleNode null");
        insertCSS();
    } else if (!document.head.innerHTML.includes(".sonn-css")) {
        console.log("head style not includes .sonn-css");
        insertCSS();
    } else {
        // TODO else only for testing purpose
        console.log("includes .sonn-css");
    }
}

composeInit();