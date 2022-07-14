browser.menus.create({
    id: "zimSearch-OpenZim",
    title: "Zim öffnen Alt+Strg+Z",
    contexts: ["message_list"],
    async onclick() {await SONN_openZim();}
});

browser.commands.onCommand.addListener(async () => {
    await SONN_openZim();
});

browser.messageDisplayAction.onClicked.addListener(async () => {
    await SONN_openZim();
});

async function SONN_openZim() {
    let tabs = await browser.tabs.query({active: true, currentWindow: true,})
    let tabId = tabs[0].id;
    let message = await browser.messageDisplay.getDisplayedMessage(tabId);

    // Try to use file number for lookup
    let subject = message.subject;
    let file_match = subject.match(/\b([RM] ?\d{4,5}(\/[A-Z]{2})?|K ?\d{4,5}|J ?\d{4,5}(\/\d{1,2})?|[EGU] ?\d{4}|S ?\d{3})\b/gi);
    if (file_match == null) {return}
    let file = file_match[0].toUpperCase().replace(/ /g, "").replace().replace(/\//g, "-")
    await browser.OpenZim.openExternal('zim-sonnref:///' + file);
}
