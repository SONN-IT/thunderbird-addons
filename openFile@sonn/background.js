browser.menus.create({
    id: "phoenixqs-OpenFile",
    title: "Akt öffnen Alt+Strg+D",
    contexts: ["message_list"],
    async onclick() {SONN_openFile();}
});

browser.commands.onCommand.addListener((command) => {
    if (command === "Event-SONN_openFile") {
        SONN_openFile();
    }
});

browser.messageDisplayAction.onClicked.addListener(async () => {
    SONN_openFile();
});

function SONN_openFile() {
    browser.tabs.query({
        active: true,
        currentWindow: true,
    }).then(tabs => {
        let tabId = tabs[0].id;
        browser.messageDisplay.getDisplayedMessage(tabId).then((message) => {
            //browser.OpenFolder.showItemInFolder("/opt/");
            let dirtypes = {e: 100, g: 100, j: 100, k: 100, m: 500, r: 500, s: 100, u: 100};

            // Try to use file number for lookup
            let subject = message.subject;
            console.log(subject);
            let file_match = subject.match(/\b([RSGMUEJK] ?\d{4,5}|S ?\d{3})\b/gi);

            if (file_match) {
                var filebase = "";
                try {
                    // TODO filebase in cfg or policies.json
                    filebase = "/poseidon/akten/"
                } catch (ex) {
                    // do nothing
                }
                if (filebase) {
                    for (let m of file_match) {
                        f = m.toLowerCase().replace(/ /g, '');
                        filetype = f.slice(0,1);
                        filenum = parseInt(f.slice(1), 10);
                        dirnum = filenum - filenum % dirtypes[filetype];
                        fileurl = filebase + filetype + "/" +
                            dirnum.toString().padStart(5, '0') + "-" +
                            (dirnum + dirtypes[filetype] - 1).toString().padStart(5, '0') +
                            "/" + filetype + filenum.toString().padStart(5, '0');
                        console.log(fileurl);
                        browser.OpenFolder.showItemInFolder(fileurl);
                    }
                }
            }
        })
    })
}
