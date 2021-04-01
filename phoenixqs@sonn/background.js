browser.menus.create({
    id: "phoenixqs-SendToSIN",
    title: "In SIN öffnen Alt+Strg+S",
    contexts: ["message_list"],
    async onclick(info) {SendToSIN();},
});

browser.commands.onCommand.addListener((command) => {
    if (command === "phoenixqs_SendToSIN") {
        SendToSIN();
    }
});

browser.messageDisplayAction.onClicked.addListener(async () => {
    SendToSIN();
});

function SendToSIN() {
    browser.tabs.query({
        active: true,
        currentWindow: true,
    }).then(tabs => {
        let tabId = tabs[0].id;
        browser.messageDisplay.getDisplayedMessage(tabId).then((message) => {
            let qsurl = "https://sin-phoenix.sonn.intern/QuickSearch.search?q=";
            let subject = message.subject;
            let file_match = subject.match(/\b([RM] ?\d{4,5}(\/[A-Z]{2})?|K ?\d{4,5}|J ?\d{4,5}(\/\d{1,2})?|[EGU] ?\d{4}|S ?\d{3})\b/gi);
            if (file_match && file_match.length > 1) {
                let files_match;
                files_match = file_match[0];
                for (let m = 1; m < file_match.length; m++) {
                    files_match = files_match + " OR " + file_match[m];
                }
                files_match = encodeURIComponent(files_match);
                browser.windows.openDefaultBrowser(qsurl + "%3Amulti%3A" + files_match);
            } else if (file_match) {
                file_match = encodeURIComponent(file_match[0]);
                // space replace not necessary?
                //browser.windows.openDefaultBrowser(qsurl + file_match.replace(/ /g, ''));
                browser.windows.openDefaultBrowser(qsurl + file_match);
                console.log(file_match);
            } else {
                let author = message.author;
                let addr_match = author.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);

                if (addr_match) {
                    // Verwende die letzte gefundene Adresse
                    addr_match = encodeURIComponent(addr_match[addr_match.length - 1]);
                    browser.windows.openDefaultBrowser(qsurl + addr_match);
                    console.log(addr_match);
                } else {
                    browser.notifications.create({
                        "type": "basic",
                        "title": "Thunderbird - SIN Suche",
                        "message": "Es konnte kein Akt/Absender gefunden werden"
                    });
                }
            }
        })
    })
}