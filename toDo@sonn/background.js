browser.messageDisplayAction.onClicked.addListener(async () => {
    await main();
});

async function main() {
    let tabs = await browser.tabs.query({active: true, currentWindow: true});
    console.log("tabs: ", tabs);
    let tabId = tabs[0].id;
    let message = await browser.messageDisplay.getDisplayedMessage(tabId);
    console.log("message: ", message);
    if (!message) {return 0}

    if (message.folder.path === "/Drafts") {
        console.log("drafts mail: exit")
        browser.notifications.create({
            "type": "basic",
            "title": "Thunderbird - ToDo",
            "message": "Entwürfe können nicht für ToDo's verwendet werden"
        });
    } else {
        browser.messages.onCopied.addListener(async function copiedMessageListener(originalMessages, copiedMessages) {
            console.log("copiedMessageListener");
            let originalMessage = originalMessages.messages[0];
            let copiedMessage = copiedMessages.messages[0];

            if (originalMessage.id === message.id && copiedMessage) {
                let imapUid = await browser.ImapTools.getImapUID(copiedMessage.id)
                console.log("copiedMessage imapUid", imapUid);
                console.log("copiedMessage: ", copiedMessage);
                let baseUrl = await messenger.LegacyPrefs.getPref("extensions.todo.baseurl");
                if (baseUrl == null) {
                    console.log("please setup pref extensions.todo.baseurl e.g. https://localhost");
                    return
                }

                if(imapUid) {
                    // let query = "?uid=" + imapUid + ";subject=" + encodeURIComponent(copiedMessage.subject);
                    let query = "msgID=" + imapUid.toString();
                    browser.windows.openDefaultBrowser(baseUrl + "?" + query);
                } else {
                    browser.notifications.create({
                        "type": "basic",
                        "title": "Thunderbird - ToDo",
                        "message": "Fehler bei der Todo Erstellung"
                    });
                }
            }
            browser.messages.onCopied.removeListener(copiedMessageListener);
        });

        try {
            await browser.messages.copy([message.id], {
                accountId: message.folder.accountId,
                path: '/Drafts'
            });
        } catch (e) {
            console.log("Failed to copy message: ", e);
        }
    }
}