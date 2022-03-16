const { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");

debug('filter.js loaded');

function addCustomFilter() {
debug('Filter: addCustomFilter');
  let action={      //nsIMsgFilterCustomAction
    id: "simpleMailRedirection@ggbs.de#redirect",
//TODO: localize
    name:  'Redirect To: ',
    isValidForType: function(type, scope) {
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
debug('Filter: isValidForType called');
debug('Filter:    type='+type);
debug('Filter:    scope='+scope);
      return true;
    },
    validateActionValue: function(actionValue, actionFolder, filterType) {
      //actionValue: in AUTF8String
      //actionFolder: nsIMsgFolder
      //filterType: nsMsgFilterTypeType 
debug('Filter: validateActionValue called');
debug('Filter:    actionValue='+actionValue);
debug('Filter:    actionFolder='+actionFolder.URI);
debug('Filter:    filterType='+filterType);
//TODO: split on ',' or ';' and check for valid addresses
      //same test as for forwardmessage in chrome\messenger\content\messenger\searchWidgets.js
      if (actionValue.length < 3 || actionValue.indexOf("@") < 1) {
//TODO: localize
        return 'Invalid e-mail address';
      } else return null;
    },
    allowDuplicates: true,
    applyAction: function(msgHdrs, actionValue, copyListener, filterType, msgWindow) {
        //msgHdrs Array<nsIMsgDBHdr>
        //actionValue AUTF8String
        //copyListener nsIMsgCopyServiceListener
        //filterType nsMsgFilterTypeType
        //msgWindow nsIMsgWindow
debug('Filter: applyAction called');
debug('Filter:    msgHdrs='+msgHdrs);
debug('Filter:    actionValue='+actionValue);
debug('Filter:    copyListener='+copyListener);
debug('Filter:    filterType='+filterType);
debug('Filter:    msgWindow='+msgWindow);
      let msgHdr=msgHdrs[0];  //nsIMsgHdr
debug('FILTER: msghdr='+msgHdr+' '+msgHdr.messageKey);
//      let accountId=msgHdr.accountKey;  //is '' :-(
      let account=MailServices.accounts.FindAccountForServer(msgHdr.folder.server);
      let accountId=account.key;
debug('FILTER: accountId='+accountId);
      let identity=account.defaultIdentity;
debug('FILTER: identity='+identity);
      let resent={'TO': actionValue};
      let params={};  // might be: {copy2sent: true}
      msgHdrs.forEach((msgHdr) => {
        prepareMessage(msgHdr, accountId, identity, params, resent, null/*windowId*/, null/*mh.id*/);
      });
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

function registerListener() {
debug('registering window listener');
  ExtensionSupport.registerWindowListener("SimpleMailRedirection", {
    chromeURLs: [
      "chrome://messenger/content/FilterEditor.xhtml",
    ],
    onLoadWindow: function(w) {
debug('loaded '+w.document.location);
      patchRuleactiontargetWrapper(w);
      //w.setTimeout(patchRuleactiontargetWrapper, 1000, w);
    },
    onUnloadWindow: function(w) {
    }
  });
}; //end function register()

addCustomFilter();
registerListener();
