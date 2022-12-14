browser.messageDisplayAction.onClicked.addListener(async () => {
    await main();
});

async function main() {
    const tabs = await browser.tabs.query({active: true, currentWindow: true});
    // console.log("tabs: ", tabs);
    const tabId = tabs[0].id;
    const message = await browser.messageDisplay.getDisplayedMessage(tabId);
    // console.log("message: ", message);
    if (!message) {return 0}

    if (message.folder.path === "/Drafts") {
        // console.log("drafts mail: exit")
        browser.notifications.create({
            "type": "basic",
            "title": "Thunderbird - ToDo",
            "message": "Entwürfe können nicht für ToDo's verwendet werden"
        });
    } else {
        browser.messages.onCopied.addListener(async function copiedMessageListener(originalMessages, copiedMessages) {
            // console.log("copiedMessageListener");
            const originalMessage = originalMessages.messages[0];
            const copiedMessage = copiedMessages.messages[0];

            if (originalMessage.id === message.id && copiedMessage) {
                const headerMessageId = copiedMessage.headerMessageId
                // console.log("copiedMessage imapUid", headerMessageId);
                // console.log("copiedMessage: ", copiedMessage);
                const baseUrl = await messenger.LegacyPrefs.getPref("extensions.todo.baseurl");
                if (baseUrl == null) {
                    // console.log("please setup pref extensions.todo.baseurl e.g. https://localhost");
                    browser.notifications.create({
                        "type": "basic",
                        "title": "Thunderbird - ToDo",
                        "message": "please setup pref extensions.todo.baseurl e.g. https://localhost"
                    });
                    return
                }

                if(headerMessageId) {
                    const query = "msgID=" + encodeURIComponent(headerMessageId);
                    await new Promise(r => setTimeout(r, 500));
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
            // console.log("Failed to copy message: ", e);
            browser.notifications.create({
                "type": "basic",
                "title": "Thunderbird - ToDo",
                "message": "Die E-Mail konnte nicht kopiert werden"
            });
        }
    }
}