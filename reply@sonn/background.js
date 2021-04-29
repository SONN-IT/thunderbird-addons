browser.composeAction.onClicked.addListener(async (tab) => {
    await addAblage(tab);
});

async function addAblage(tab) {
    let message = await browser.compose.getComposeDetails(tab.id);
    if (!message.subject) {return}

    let fileMatch = message.subject.match(/\b(([MRU]\s?\d{4,5}\/[A-Z]{1,2}(?!\/)|J\s?\d{4,5}\/\d{1,3}|[MGURKE]\s?\d{4,5}|S\s?\d{3})(?!-))\b/gi);
    if (!fileMatch) {return}

    let recipientType = "cc"
    let recipientAddr = [];

    let sentTypes = [ "to", "cc", "bcc" ];
    sentTypes.forEach(sentType => {
        recipientAddr = recipientAddr.concat(message[sentType]);
    })

    for (const addr of recipientAddr) {
        let internalDomain = addr.match(/\b(.*\@(.*\.)?sonn\.(at|intern))|(.*\@ablage(\.sonn\.(at|intern))?)\b/gi);
        if (!internalDomain) {
            recipientType= "bcc";
            break;
        }
    }

    let ablageMail = [];
    for (let m of fileMatch) {
        // remove space between akt type and number e.g. R 60000 --> R60000
        let fileRaw = m.replace(/ /g, '');
        fileRaw = fileRaw.toLowerCase().substring(0, 1) + fileRaw.toUpperCase().substring(1).padStart(5, '0');
        ablageMail.push(fileRaw.replace(/\//g, '-') + "@ablage");
    }

    // composeRecipientList could be also a string, but default is array
    let composeRecipientList = message[recipientType].concat(ablageMail);
    browser.compose.setComposeDetails(tab.id, {[recipientType]: composeRecipientList});
}