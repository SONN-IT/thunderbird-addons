browser.menus.create({
    id: "phoenixqs-OpenFile",
    title: "Akt öffnen Alt+Strg+D",
    contexts: ["message_list"],
    async onclick() {await SONN_openFile();}
});

browser.commands.onCommand.addListener(async () => {
    await SONN_openFile();
});

browser.messageDisplayAction.onClicked.addListener(async () => {
    await SONN_openFile();
});

function getCaseRange (type, num) {
    let caseRange = [];
    switch (type) {
        case "r":
            caseRange = [
                {from :     1, to :  9999, step: false},
                {from : 10000, to : 29999, step : false},
                {from : 30000, to : 32999, step : false},
                {from : 33000, to : Number.POSITIVE_INFINITY, step : 500}
            ];
            break;
        case "s":
            caseRange = [
                {from: 1, to: Number.POSITIVE_INFINITY, step: 100}
            ];
            break;
        case "g":
            caseRange = [
                {from :    1, to : 999, step : 500},
                {from : 1000, to : Number.POSITIVE_INFINITY, step : 100}
            ];
            break;
        case "m":
            caseRange = [
                {from :     1, to :  6999, step : false},
                {from :  7000, to :  9999, step : false},
                {from : 10000, to : 12999, step : false},
                {from : 13000, to : 14999, step : false},
                {from : 15000, to : 16999, step : false},
                {from : 17000, to : 18999, step : false},
                {from : 19000, to : 19999, step : false},
                {from : 20000, to : 20999, step : false},
                {from : 21000, to : 21999, step : false},
                {from : 22000, to : 22999, step : false},
                {from : 23000, to : Number.POSITIVE_INFINITY, step : 500}
            ];
            break;
        case "u":
            caseRange = [
                {from :    1, to :  999, step : false},
                {from : 1000, to : 1399, step : false},
                {from : 1400, to : Number.POSITIVE_INFINITY, step : 100}
            ];
            break;
        case "e":
            caseRange = [
                {from :    1, to : 1499, step : false},
                {from : 1500, to : 1799, step : false},
                {from : 1800, to : Number.POSITIVE_INFINITY, step : 100}
            ];
            break;
        case "j":
            caseRange = [
                {from :    1, to : 1499, step : false},
                {from : 1500, to : Number.POSITIVE_INFINITY, step : 100}
            ];
            break;
        case "k":
            caseRange = [
                {from :    1, to : 2499, step : false},
                {from : 2500, to : Number.POSITIVE_INFINITY, step : 100}
            ];
            break;
    }

    let bounds;
    for (let range in caseRange) {
        if (num >= caseRange[range].from && num <= caseRange[range].to) {
            if (caseRange[range].step) {
                let min = Math.floor(num / caseRange[range].step) * caseRange[range].step;
                bounds = [min || 1, min + caseRange[range].step - 1];
            } else {
                bounds = [caseRange[range].from, caseRange[range].to];
            }
            break;
        }
    }
    return bounds
}

async function SONN_openFile() {
    let tabs = await browser.tabs.query({active: true, currentWindow: true,})
    let tabId = tabs[0].id;
    let message = await browser.messageDisplay.getDisplayedMessage(tabId);

    // Try to use file number for lookup
    let subject = message.subject;
    let file_match = subject.match(/\b([RM] ?\d{4,5}(\/[A-Z]{2})?|K ?\d{4,5}|J ?\d{4,5}(\/\d{1,2})?|[EGU] ?\d{4}|S ?\d{3})\b/gi);
    if (file_match == null) {return}

    let filebase = await messenger.LegacyPrefs.getPref("extensions.phoenixqs.filebase");
    if (filebase == null) {
        console.log("please setup pref extensions.phoenixqs.filebase");
        return
    }

    let enableFileLink = await messenger.LegacyPrefs.getPref("extensions.phoenixqs.enableFileLink");
    let platformInfo = await browser.runtime.getPlatformInfo();

    for (let m of file_match) {
        let f = m.toLowerCase().replace(/ /g, '');
        let filetype = f.slice(0, 1);
        let filenum = parseInt(f.slice(1), 10);
        let dirRange = getCaseRange(filetype, filenum);
        let fileurl = filebase + filetype + "/" +
            dirRange[0].toString().padStart(5, '0') + "-" +
            dirRange[1].toString().padStart(5, '0') +
            "/" + filetype + filenum.toString().padStart(5, '0');
        if(platformInfo.os === "win") {
            fileurl = fileurl.replace(/\//g, '\\');
        }
        if (enableFileLink && enableFileLink === true) {
            await browser.OpenFolder.openFileLink(fileurl);
        } else {
            await browser.OpenFolder.showItemInFolder(fileurl);
        }
    }
}
