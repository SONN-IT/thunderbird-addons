console.log("test compose init");

let hs = document.querySelectorAll('style');
console.log("hs: ", hs);
for (let i = 0; i < hs.length; i++) {
    console.log("h nr: ", i);
    hs[i].parentNode.removeChild(hs[i]);
}

console.log("document: ", document);
// cssStyle = "body { border: 20px dotted pink; }";
let cssStyle = "\n        body,p,li,td,th,pre,h1,h2,h3,h4,h5,h6,address,sub,sup,cite,abbr,acronym,code,samp,var,tt,.sonn-css {\n" +
           "            font-family: Calibri, Carlito, Arial, Sans-Serif;\n" +
           "            font-size: 20px;\n" +
           "            background-color: #fff;\n" +
           "            color: #6495ED;\n" +
           "        }\n";
let style = document.createElement('style');
style.innerText = cssStyle;
document.head.appendChild(style);
document.body.classList.add("sonn-css");