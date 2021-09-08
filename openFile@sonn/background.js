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

async function SONN_openFile() {
    let tabs = await browser.tabs.query({active: true, currentWindow: true,})
    let tabId = tabs[0].id;
    let message = await browser.messageDisplay.getDisplayedMessage(tabId);
    //browser.OpenFolder.showItemInFolder("/opt/");
    let dirtypes = {e: 100, g: 100, j: 100, k: 100, m: 500, r: 500, s: 100, u: 100};

    // Try to use file number for lookup
    let subject = message.subject;
    let file_match = subject.match(/\b([RM] ?\d{4,5}(\/[A-Z]{2})?|K ?\d{4,5}|J ?\d{4,5}(\/\d{1,2})?|[EGU] ?\d{4}|S ?\d{3})\b/gi);
    if (file_match == null) {return}

    let filebase = await messenger.LegacyPrefs.getPref("extensions.phoenixqs.filebase");
    if (filebase == null) {
        console.log("please setup pref extensions.phoenixqs.filebase");
        return
    }

    for (let m of file_match) {
        let f = m.toLowerCase().replace(/ /g, '');
        let filetype = f.slice(0, 1);
        let filenum = parseInt(f.slice(1), 10);
        let dirnum = filenum - filenum % dirtypes[filetype];
        let fileurl = filebase + filetype + "/" +
            dirnum.toString().padStart(5, '0') + "-" +
            (dirnum + dirtypes[filetype] - 1).toString().padStart(5, '0') +
            "/" + filetype + filenum.toString().padStart(5, '0');
        let platformInfo = await browser.runtime.getPlatformInfo();
        if(platformInfo.os === "win") {
            fileurl = fileurl.replace(/\//g, '\\');
        }
        console.log("fileurl: ", fileurl);
        await browser.OpenFolder.showItemInFolder(fileurl);
    }
}
