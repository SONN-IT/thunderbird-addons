//const { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
var m3p = Services.wm.getMostRecentWindow("mail:3pane");

debug('Filter: filter.js loaded');
debug('Filter:   de_ggbs_SimpleMailRedirect_Filter='+m3p.de_ggbs_SimpleMailRedirect_Filter);

const redirectFilterAction = {
  isValidForType(type, scope) {
    /*type: nsMsgFilterTypeType     17=Manual|InboxRule
        None             = 0x00;
        InboxRule        = 0x01;
        InboxJavaScript  = 0x02;
        Inbox            = InboxRule | InboxJavaScript;
        NewsRule         = 0x04;
        NewsJavaScript   = 0x08;
        News             = NewsRule | NewsJavaScript;
        Incoming         = Inbox | News;
        Manual           = 0x10;
        PostPlugin       = 0x20; // After bayes filtering
        PostOutgoing     = 0x40; // After sending
        Archive          = 0x80; // Before archiving
        Periodic         = 0x100;// On a repeating timer
        All              = Incoming | Manual;
    */
   /*scope: nsMsgSearchScopeValue   3=onlineMailFilter
      offlineMail = 0;
      offlineMailFilter = 1;
      onlineMail = 2;
      onlineMailFilter = 3;
        /// offline news, base table, no body or junk
      localNews = 4;
      news = 5;
      newsEx = 6;
      LDAP = 7;
      LocalAB = 8;
      allSearchableGroups = 9;
      newsFilter = 10;
      LocalABAnd = 11;
      LDAPAnd = 12;
        // IMAP and NEWS, searched using local headers
      onlineManual = 13;
        /// local news + junk
      localNewsJunk = 14;
        /// local news + body
      localNewsBody = 15;
        /// local news + junk + body
      localNewsJunkBody = 16;
    */
debug('Filter: isValidForType: type='+type+' scope='+scope)
    return true;
  },
  validateActionValue(actionValue, actionFolder, filterType) {
    //actionValue: in AUTF8String
    //actionFolder: nsIMsgFolder
    //filterType: nsMsgFilterTypeType 
debug('Filter: validateActionValue: actionValue='+actionValue+' actionFolder='+actionFolder.URI+' filterType='+filterType);
//TODO: split on ',' or ';' and check for valid addresses
    //same test as for forwardmessage in chrome\messenger\content\messenger\searchWidgets.js
    if (actionValue.length < 3 || actionValue.indexOf("@") < 1) {
      return extension.localeData.localizeMessage('needvalidaddress');  //'Invalid e-mail address';
    } else return null;
  },
  applyAction(msgHdrs, actionValue, copyListener, filterType, msgWindow) {
      //msgHdrs Array<nsIMsgDBHdr>
      //actionValue AUTF8String
      //copyListener nsIMsgCopyServiceListener
      //filterType nsMsgFilterTypeType
      //msgWindow nsIMsgWindow
debug('Filter: applyAction called');
debug('Filter:    msgHdrs='+msgHdrs+' count='+msgHdrs.length);
debug('Filter:    actionValue='+actionValue);
debug('Filter:    copyListener='+copyListener);
debug('Filter:    filterType='+filterType);
debug('Filter:    msgWindow='+msgWindow);
    let msgHdr=msgHdrs[0];  //nsIMsgHdr
debug('Filter: msghdr='+msgHdr+' '+msgHdr.messageKey);
  //      let accountId=msgHdr.accountKey;  //is '' :-(
    let account=MailServices.accounts.FindAccountForServer(msgHdr.folder.server);
    let accountId=account.key;
debug('Filter: accountId='+accountId);
    let identity=account.defaultIdentity;
debug('Filter: identity='+identity);
    let resent={'TO': actionValue};
    let params={};  // might be: {copy2sent: true}
    msgHdrs.forEach((msgHdr) => {
      prepareMessage(msgHdr, accountId, identity, params, resent, null/*windowId*/, null/*mh.id*/);
    });
  },
};
var redirectFilter = {
  onStartup() {
debug('Filter: redirectFilter onStartup');
    Services.wm.addListener(domListener);
  },
  onShutdown() {
debug('Filter: redirectFilter onShutdown');
    Services.wm.removeListener(domListener);
  },
  redirect: redirectFilterAction,
}
var redirectFilterWrapper = {
  onStartup() {
debug('Filter: redirectFilterWrapper onStartup');
    m3p.de_ggbs_SimpleMailRedirect_Filter = redirectFilter;

    addFilterIfNotExists();

    m3p.de_ggbs_SimpleMailRedirect_Filter.onStartup();
  },

  onShutdown() {
debug('Filter: redirectFilterWrapper onShutdown');
    m3p.de_ggbs_SimpleMailRedirect_Filter.onShutdown();
    m3p.de_ggbs_SimpleMailRedirect_Filter = null;
  },
};
function addCustomFilter() {
debug('Filter: addCustomFilter de_ggbs_SimpleMailRedirect_Filter='+m3p.de_ggbs_SimpleMailRedirect_Filter);
  let action={      //nsIMsgFilterCustomAction
    id: "simpleMailRedirection@ggbs.de#redirect",
    name:  extension.localeData.localizeMessage('filter'), //'Redirect To: ',
    isValidForType: function(type, scope) {
debug('Filter: main: isValidForType: de_ggbs_SimpleMailRedirect_Filter='+m3p.de_ggbs_SimpleMailRedirect_Filter);
      return m3p.de_ggbs_SimpleMailRedirect_Filter
        ? m3p.de_ggbs_SimpleMailRedirect_Filter.redirect.isValidForType(type, scope)
        : false;
    },
    validateActionValue: function(actionValue, actionFolder, filterType) {
      return m3p.de_ggbs_SimpleMailRedirect_Filter
        ? m3p.de_ggbs_SimpleMailRedirect_Filter.redirect.validateActionValue(actionValue, actionFolder, filterType)
        : null;
    },
    allowDuplicates: true,
    applyAction: function(msgHdrs, actionValue, copyListener, filterType, msgWindow) {
      if (m3p.de_ggbs_SimpleMailRedirect_Filter)
        m3p.de_ggbs_SimpleMailRedirect_Filter.redirect.applyAction(msgHdrs, actionValue, copyListener, filterType, msgWindow);
    },
    isAsync: false,  //(if true: copy listener must be used)
    needsBody: false
  }
  MailServices.filters.addCustomAction(action);
}

function patchRuleactiontargetWrapper(w) {
debug('Filter: patchRuleactiontargetWrapper called');
  let wrapper = w.customElements.get("ruleactiontarget-wrapper");
  if (wrapper) {
    let alreadyPatched =
      wrapper.prototype.hasOwnProperty("_ggbs_de_simpleMailRedirection") ?
        wrapper.prototype._ggbs_de_simpleMailRedirection :
        false;
debug('Filter:    alreadyPatched='+alreadyPatched);

    if (alreadyPatched) return;
    let prevMethod = wrapper.prototype._getChildNode;
    if (prevMethod) {
      wrapper.prototype._getChildNode = function(type) {
debug('Filter: _getChildNode called, type='+type);
        if (type=="simpleMailRedirection@ggbs.de#redirect")
          return w.document.createXULElement("ruleactiontarget-forwardto");
        else
          return prevMethod(type);
      };
      wrapper.prototype._ggbs_de_simpleMailRedirection = true;
    }
  }
else debug('Filter: no wrapper');
}

domListener = {
  onOpenWindow(appWindow) {
    let w = appWindow.docShell.domWindow;
debug('Filter: onOpenWindow '+w.document.location.href);

    w.addEventListener(
      "DOMContentLoaded",
      function() {
        // do stuff
        let windowChromeURL = w.document.location.href;
debug('Filter: DOMContentLoaded '+windowChromeURL);
        if (windowChromeURL=='chrome://messenger/content/FilterEditor.xhtml') {
          patchRuleactiontargetWrapper(w);
        }
      },
      { once: true }
    );
  },

  onCloseWindow(appWindow) {
    // One of the windows has closed.
debug('Filter: onCloseWindow');
    let domWindow = appWindow.docShell.domWindow; // we don't need to do anything (script only loads once)
  }
    
};

function addFilterIfNotExists() {
debug('Filter: addFilterIfNotExists');
  try {
    let filter=MailServices.filters.getCustomAction("simpleMailRedirection@ggbs.de#redirect");
    if (filter) {   //nsIMsgFilterCustomAction
debug('Filter: getCustomAction returned filter, do nothing.');
    }
else debug('Filter: getCustomAction returned no filter???');
  } catch(e) {
debug('Filter: getCustomAction throws '+e+' ==> add filter');
    addCustomFilter();
  }
}
