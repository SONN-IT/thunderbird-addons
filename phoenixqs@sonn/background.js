browser.menus.create({
    id: "phoenixqs-SendToSIN",
    title: "In SIN öffnen Alt+Strg+S",
    contexts: ["message_list"],
    async onclick() {SendToSIN();},
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
        browser.messageDisplay.getDisplayedMessage(tabId).then(async (message) => {
            let qsurl = "https://sin-phoenix.sonn.intern/QuickSearch.search?q=";
            let subject = message.subject;
            let file_match = subject.match(/\b([RM] ?\d{4,5}(\/[A-Z]{2})?|K ?\d{4,5}|J ?\d{4,5}(\/\d{1,2})?|[EGU] ?\d{4}|S ?\d{3})\b/gi)

            // remove duplicates
            if(file_match && file_match.length > 1) {
                let fileSet = new Set(file_match);
                file_match = [...fileSet];
            }

            if (file_match && file_match.length > 1) {
                let files_values = file_match.shift();
                file_match.forEach(elem => files_values = files_values + " OR " + elem)
                browser.windows.openDefaultBrowser(qsurl + "%3Amulti%3A" + encodeURIComponent(files_values));
            } else if (file_match && file_match.length === 1) {
                // space replace not necessary?
                // browser.windows.openDefaultBrowser(qsurl + file_match.replace(/ /g, ''));
                browser.windows.openDefaultBrowser(qsurl + encodeURIComponent(file_match[0]));
            } else {
                let full_msg = await browser.messages.getFull(message.id);
                if (!full_msg) {return}
                let resent_raw_values = "";
                ["resent-to", "resent-cc", "resent-bcc"].forEach(elem => {
                    if(full_msg.headers[elem]) {
                        // full_msg.headers[elem] array with one element of all addresses in headers[elem]
                        if(resent_raw_values) {
                            resent_raw_values += " " + full_msg.headers[elem].toString();
                        } else {
                            resent_raw_values = full_msg.headers[elem].toString();
                        }
                    }
                })

                let resent_match = resent_raw_values.matchAll(/(?<akt>[a-z]\d+(-[a-z0-9]+)?)(#\w+)?@ablage/gi);
                // use Set to remove duplicates
                let resentSet = new Set();
                for (const result of resent_match) {
                    if (result.groups.akt) {
                        // replace "-" to "/" necessary, because SIN doesn't accept "-" e.g. J2046-3 or M23104-CH
                        resentSet.add(result.groups.akt.replace(/-/g, '\/'));
                    }
                }

                resent_match = [...resentSet];
                if (resent_match.length > 1) {
                    let resent_values = resent_match.shift();
                    resent_match.forEach(elem => resent_values = resent_values + " OR " + elem)
                    browser.windows.openDefaultBrowser(qsurl + "%3Amulti%3A" + encodeURIComponent(resent_values));
                } else if (resent_match.length === 1) {
                    browser.windows.openDefaultBrowser(qsurl + encodeURIComponent(resent_match[0]));
                } else {
                    let addr_match = message.author.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);

                    if (addr_match) {
                        // Verwende die letzte gefundene Adresse
                        addr_match = encodeURIComponent(addr_match[addr_match.length - 1]);
                        browser.windows.openDefaultBrowser(qsurl + addr_match);
                    } else {
                        //TODO replace notification with popup, if no match found
                        browser.notifications.create({
                            "type": "basic",
                            "title": "Thunderbird - SIN Suche",
                            "message": "Es konnte kein Akt/Absender gefunden werden"
                        });
                    }
                }
            }
        })
    })
}