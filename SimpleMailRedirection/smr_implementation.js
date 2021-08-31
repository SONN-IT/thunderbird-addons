const { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");

const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
const { AddonManager } = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");

const { MailServices }=ChromeUtils.import("resource:///modules/MailServices.jsm");
const { MailUtils }=ChromeUtils.import("resource:///modules/MailUtils.jsm");
const { FileUtils }=ChromeUtils.import("resource://gre/modules/FileUtils.jsm");

var chromeHandle=null;	//for cardbook
var cardbookRepository;

const EXTENSION_ID = 'simplemailredirection@ggbs.de';

const MAX_HEADER_LENGTH = 16384;

var prefs={'debug': true};
var windows=new Object;
var appVersion;

//debug('entered');
var smr = class extends ExtensionCommon.ExtensionAPI {
  onStartup() { 
//pres.debug not set yet!
//debug('onStartup');
  }

  onShutdown(isAppShutdown) {
debug('onShutdown isAppShutdown='+isAppShutdown);
      if (isAppShutdown) return;
      // Looks like we got uninstalled. Maybe a new version will be installed
      // now. Due to new versions not taking effect
      // (https://bugzilla.mozilla.org/show_bug.cgi?id=1634348)
      // we invalidate the startup cache. That's the same effect as starting
      // with -purgecaches (or deleting the startupCache directory from the
      // profile).
//TODO: remove stylesheet
      Services.obs.notifyObservers(null, "startupcache-invalidate");
  }
  getAPI(context) {
//debug('getApi entered');	//more than once!

    context.callOnClose(this);
		this.getAddon();

    return {
      smr: {
        init: async function(options) {
          prefs=options;
debug('init debug='+prefs.debug);
					let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
					timer.initWithCallback(()=>{stylesheets(context);}, 1000, Ci.nsITimer.TYPE_ONE_SHOT);
let m3p = Services.wm.getMostRecentWindow("mail:3pane");
debug('screen='+m3p.screen.width+'x'+m3p.screen.height);
					return m3p.screen;
				},
        redirect: async function(mhs, rts, params, windowId, options) {
          prefs=options;
debug('redirect from window '+windowId);
debug('prefs='+JSON.stringify(prefs));
mhs.forEach(mh=>debug('redirect '+mh.subject+' ('+mh.author+')'));
rts.forEach(addr=>debug('resentTo '+addr.to+' '+addr.email));
          windows[windowId].msgCount=mhs.length;
          mhs.forEach(mh=>{
            windows[windowId][mh.id]=mh;
            windows[windowId][mh.id].state='started';
          });
//TEST:
//mhs.forEach(mh=>windows[windowId][mh.id]['msgSend']='send_'+mh.id);
          let resentTo='';
          let resentCc='';
          let resentBcc='';
          rts.forEach(addr=>{
            if (addr.to=='TO') resentTo+=addr.email+',';
            else if (addr.to=='CC') resentCc+=addr.email+',';
            else if (addr.to=='BCC') resentBcc+=addr.email+',';
else debug('Unknown addr.to '+addr.to);
          });
          resentTo=resentTo.replace(/,$/, '');
          resentCc=resentCc.replace(/,$/, '');
          resentBcc=resentBcc.replace(/,$/, '');
debug('resentTo='+resentTo);
debug('resentCc='+resentCc);
debug('resentBcc='+resentBcc);

          let accountId=params.accountId; //mh.folder.accountId;
          let identity = MailServices.accounts.getIdentity(params.identityId);
          mhs.forEach((mh) => {
            let msgHdr=context.extension.messageManager.get(mh.id);
debug('got msgHdr id='+msgHdr.messageKey);
/*obsolete
            let mAccountId=mh.folder.accountId;
            let path=mh.folder.path;
debug('resent '+mh.subject+' ('+mh.author+') to: '+mAccountId+' '+path+' '+resentTo+'|'+resentCc+'|'+resentBcc);
            let mAccount=MailServices.accounts.getAccount(mAccountId);
            let folderURI=mAccount.incomingServer.rootFolder.URI+path;
            let folder=MailUtils.getExistingFolder(folderURI);
debug('msgHdr.folder.URI='+msgHdr.folder.URI+' folder.URI='+folder.URI);
debug('msgHdr.folder.URL='+msgHdr.folder.folderURL+' folder.URL='+folder.folderURL);
*/
//debug('current keywords: '+msgHdr.getStringProperty("keywords"));
            if (/(?:^| )redirected(?: |$)/.test(msgHdr.getStringProperty("keywords"))) {
debug('..already resent!');
/*
debug('Test: remove redirected indicator from old version');
//up to TB84
let msg = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
msg.appendElement(msgHdr, false);
//since TB85
let msg=[msgHdr];
msgHdr.folder.removeKeywordsFromMessages(msg, "resent");
msgHdr.folder.addKeywordsToMessages(msg, "redirected");
*/
            }
            let msgUri = msgHdr.folder.generateMessageURI(msgHdr.messageKey);
/*obsolete
            let identity = account.defaultIdentity;
						if (!identity) { //account has no identities (e.g. Local Folders), use default account
							account=MailServices.accounts.defaultAccount;
debug('account has no identities, use default identity of default account');
              if (!account) { // not default account, use first imap account
debug('no default account, use default identity of first usable account');
                for (let a of MailServices.accounts.accounts) {
                  if (a.defaultIdentity) {
                    account=a;
                    break;
                  }
                }
              }
							accountId=account.key;
							identity = account.defaultIdentity;
						}
            if (!account) { // no usable account found
              console.error('SMR: Could not redirect: no usable account found');
              Services.prompt.alert(null, 'SimpleMailRedirect',
                'Nachricht kann nicht umgeleitet werden, kein nutzbares Konto gefunden!\n'+
                'Cannot redirect message, no usable account found!');
              return;
            }
*/
            let sender=MailServices.headerParser.makeMimeHeader([{name: identity.fullName, email: identity.email}], 1);
debug('call resent URI='+msgUri+' sender='+sender);
            let msgCompFields = Cc["@mozilla.org/messengercompose/composefields;1"].
                             createInstance(Ci.nsIMsgCompFields);
            if (resentTo) msgCompFields.to=resentTo;  //this converts to quoted printable!
            if (resentCc) msgCompFields.cc=resentCc;  //this converts to quoted printable!
            if (resentBcc) msgCompFields.bcc=resentBcc;  //this converts to quoted printable!
            msgCompFields.from = sender;
            if (params.copy2sent) {
              msgCompFields.fcc = identity.fccFolder;
debug('copy msg to '+identity.fccFolder);
            } else {
              msgCompFields.fcc = "nocopy://";
            }
            msgCompFields.fcc2 = "";	//was "nocopy://", but TB91 needs ""
						let messageId = Cc["@mozilla.org/messengercompose/computils;1"].
              createInstance(Ci.nsIMsgCompUtils).
              msgGenerateMessageId(identity);
						msgCompFields.messageId=messageId;
            resentMessage(mh.id, windowId, msgUri, accountId, msgCompFields, identity);
          }); //end loop over mhs
				},
        abort: async function(windowId, msgId) {
debug('abort windowId='+windowId+' msgId='+msgId);
          let msg=windows[windowId][msgId];
          if (msg.msgSend) {
debug('already sending, abort')
            msg.msgSend.abort();
          }
          msg.state='abort';  //mark for abort after filecopy
        },
        cb_exists: function() {
debug('cb: exists?');
					// try to load cardbook, must be delayed until cardbook fully loaded
					if (!chromeHandle) {
debug('cb: registerChrome');
						registerChromeUrl(context, [ ["content", "cardbook", "chrome/content/"] ]);
						try {
debug('cb: try loading cardbookRepository');
							cardbookRepository=ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
							cardbookRepository=cardbookRepository.cardbookRepository;
debug('cb: try loading cardbookRepository: ok');
//debug(cb:'  cardbookRepository: '+JSON.stringify(Object.keys(cardbookRepository)));
						} catch(e) {
//							console.debug('SMR: cardbook not installed: '+e);
							debug('cardbook not installed');
						}
debug('cb: unregisterChrome');
						chromeHandle.destruct();
						chromeHandle = true;
debug('cb: try loading cardbookRepository done');
					}
//debug('cb:  cardbookRepository: '+JSON.stringify(Object.keys(cardbookRepository)));
					if (typeof cardbookRepository=='undefined') {
debug('cb: exists: cardbook not installed');
						return 0;																						//no cardbook
					} else if (cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.exclusive")) {
debug('cb: exists: cardbook installed, use only cardbook');
						return 1;																						//only cardbook
					} else {
debug('cb: exists: cardbook installed, also use TB addressbook');
						return 2;																						// cardbook and TB's addressbook
					}
        },
        cb_open: async function() {
debug('cb: open');
					if ((typeof cardbookRepository)=='undefined') return;
					let m3p = Services.wm.getMostRecentWindow("mail:3pane");
					if (m3p) {
						let tabmail = m3p.document.getElementById("tabmail");
						if (tabmail) {
							//m3p.focus();
							tabmail.openTab('cardbook', {title: cardbookRepository.extension.localeData.localizeMessage("cardbookTitle")});
						}
					}
        },
				cb_list: async function(list) {
					if ((typeof cardbookRepository)=='undefined') return;
					let lists=[];
					for (let j in cardbookRepository.cardbookCards) {
						let card = cardbookRepository.cardbookCards[j];
						if (card.isAList) {
							if (list) { //unwrap list to addresses
								if (card.uid == list) {
debug('cb_list found: '+card.fn);
									let emails=[];
									let members = cardbookRepository.cardbookUtils.getMembersFromCard(card);
//debug('members: '+JSON.stringify(members))
									for (let email of members.mails) {	//pure emails
										emails.push(email);
									}
									for (let card of members.uids) {
										if (card.fn)
											emails.push('"'+card.fn+'" <'+card.emails[0]+'>');
										else
											emails.push(card.emails[0]);
									}
									return emails;
								}
							} else {  // return list
//debug('cb_list: '+card.fn+' '+JSON.stringify(card));
								let colors=cb_cardColors(card);
								lists.push({name: card.fn, id: card.uid, bcolor: colors.bcolor, fcolor: colors.fcolor});
							}
						}
					}
					return lists;
				},
        cb_search: async function(search) {
debug('cb: search');
					if ((typeof cardbookRepository)=='undefined') return;
/*
// what messenger.contacts.quickSearch() searches:
const {
	getSearchTokens,
	getModelQuery,
	generateQueryURI,
} = ChromeUtils.import("resource:///modules/ABQueryUtils.jsm");
let searchWords = getSearchTokens(search);
if (searchWords.length == 0) {
	return [];
}
debug('searchWords: '+JSON.stringify(searchWords));
//"G. G" @ -> ["G. G","@"]
let searchFormat = getModelQuery(
	"mail.addr_book.quicksearchquery.format"
);
debug('searchFormat: '+searchFormat);
//(or(DisplayName,c,@V)(FirstName,c,@V)(LastName,c,@V)(NickName,c,@V)(PrimaryEmail,c,@V)(SecondEmail,c,@V)(and(IsMailList,=,TRUE)(Notes,c,@V))(Company,c,@V)(Department,c,@V)(JobTitle,c,@V)(WebPage1,c,@V)(WebPage2,c,@V))
let searchQuery = generateQueryURI(searchFormat, searchWords);
debug('searchQuery: '+searchQuery);
//?(and(or(DisplayName,c,G.%20G)(FirstName,c,G.%20G)(LastName,c,G.%20G)(NickName,c,G.%20G)(PrimaryEmail,c,G.%20G)(SecondEmail,c,G.%20G)(and(IsMailList,=,TRUE)(Notes,c,G.%20G))(Company,c,G.%20G)(Department,c,G.%20G)(JobTitle,c,G.%20G)(WebPage1,c,G.%20G)(WebPage2,c,G.%20G))(or(DisplayName,c,G)(FirstName,c,G)(LastName,c,G)(NickName,c,G)(PrimaryEmail,c,G)(SecondEmail,c,G)(and(IsMailList,=,TRUE)(Notes,c,G))(Company,c,G)(Department,c,G)(JobTitle,c,G)(WebPage1,c,G)(WebPage2,c,G)))
*/
					try {
						let searchString = cardbookRepository.makeSearchString(search);
								//removes [\s.,;-], converts ü to u and uppercases
debug('cb: searchString: '+searchString);
//"g. g" -> "GG" and Gün - >GUN

/*	ignore autocompleteRestrictSearch*/
debug('cb: autocompleteRestrictSearch: '+cardbookRepository.autocompleteRestrictSearch);
						let searchArray = cardbookRepository.autocompleteRestrictSearch
										? cardbookRepository.cardbookCardShortSearch
										: cardbookRepository.cardbookCardLongSearch;
							//also searches birthday, addresses, telefonenumbers etc.
let c=0;
for (let a in searchArray) c+=Object.keys(searchArray[a]).length;
debug('cb: searchArray: '+c+' entries');
//debug('cb: searchArray: '+JSON.stringify(searchArray));
						let addresses=new Array();
						if (Object.keys(searchArray).length==0) return addresses;
						search=search.toUpperCase();
						for (let account of cardbookRepository.cardbookAccounts) {
//debug('cb: account: '+JSON.stringify(account));
							if (account[1] && account[5] && account[6] != "SEARCH") {
								let dirPrefId = account[4];
								for (let j in searchArray[dirPrefId]) {
//debug('cb: address: '+j);
// j="GERSDORF|GUNTER||||GUNTERGERSDORF|||495312094612|4917663219681|GGERSDORF@GGBSDE|GGERSDORF@WEBDE|||"
//		if isnotset cardbookRepository.autocompleteRestrictSearch
// j="GUNTER|GERSDORF"	if isset cardbookRepository.autocompleteRestrictSearch
									if (j.indexOf(searchString) >= 0 || searchString == "") {
										for (let card of searchArray[dirPrefId][j]) {
//debug('cb: card: '+JSON.stringify(card));
//card properties: lastname,firstname,othername,prefixname,suffixname,fn,nickname,org
											//reduce matches (dont deliver matches in birthday, , addresses, telefonenumbers etc.)
											if (cardbookRepository.autocompleteRestrictSearch || cardBookSearch(card).indexOf(search) >= 0) {
												let colors=cb_cardColors(card);
												for (let l = 0; l < card.email.length; l++) {
													addresses.push({email: '"'+card.fn+'" <'+card.email[l][0][0]+'>',
                            bcolor: colors.bcolor, fcolor: colors.fcolor});
												}
											}
										}
									}
								}
							}
						}
debug('cb: search result: '+addresses.length);
//debug('cb: search result: '+JSON.stringify(addresses));
						return addresses;
					} catch(e) {console.debug(e)}
        },
        onMailSent: new ExtensionCommon.EventManager({
          context,
          name: "smr.onMailSent",
          register(fire, windowIdparam) {
debug('onMailSent register windowId='+windowIdparam);
            let windowId=windowIdparam;
            windows[windowId]=new Object;
            windows[windowId].fire=fire;
            return function() {
debug('onMailSent unregister windowId='+windowId);
              if (!windows[windowId]) return;
              windows[windowId].fire=null;
              for (const [msgId, msg] of Object.entries(windows[windowId])) {
                if (isNaN(msgId)) continue; //.fire or other
debug('  abort '+msgId+' '+msg.subject);
                if (msg.state=='started') {
                  if (msg.msgSend) {
debug('    already sending, abort')
                    msg.msgSend.abort();
                  }
                  msg.state='abort';  //mark for abort after filecopy
                }
              }
            };
          },
        }).api(),
			}
    }
  }
  close() {
    // This function is called if the extension is disabled or removed, or Thunderbird closes.
    // Also called if our html window closes
debug('close');
  }
  async getAddon() {
    let addOn=await AddonManager.getAddonByID(EXTENSION_ID);
    let console = Services.console;
    let app = Services.appinfo;
    console.logStringMessage('SimpleMailRedirection: '+addOn.version+' on '+app.name+' '+app.version);
		appVersion=app.version.replace(/^(\d+\.\d+)(\..*)?$/, '$1');
  }

};

function cb_cardColors(card) {
	let bcolor=cardbookRepository.cardbookPreferences.getColor(card.dirPrefId);
	let fcolor;
	for (let category of card.categories) {
		let color=cardbookRepository.cardbookNodeColors[category];
		if (!color) {
			continue;
		} else{
			bcolor=color;
			break;
		}
	}
	if (bcolor)
		fcolor = cardbookRepository.getTextColorFromBackgroundColor(bcolor);
	return {fcolor: fcolor, bcolor: bcolor};
}

function registerChromeUrl(context, chromeData) {
debug('registerChromeUrl');
	const aomStartup = Cc["@mozilla.org/addons/addon-manager-startup;1"].getService(Ci.amIAddonManagerStartup);
	const manifestURI = Services.io.newURI(
		"manifest.json",
		null,
		context.extension.rootURI
	);
	chromeHandle = aomStartup.registerChrome(manifestURI, chromeData);         
debug('registerChromeUrl chromeHandle='+chromeHandle);
}

function cardBookSearch(aCard) {
	var lResult = "";
	var sep = "|";
	lResult = lResult + aCard.lastname + sep;
	lResult = lResult + aCard.firstname + sep;
	lResult = lResult + aCard.othername + sep;
//	lResult = lResult + aCard.prefixname + sep;
//	lResult = lResult + aCard.suffixname + sep;
	lResult = lResult + aCard.fn + sep;
	lResult = lResult + aCard.nickname + sep;
	for (let i = 0; i < aCard.email.length; i++) {
		lResult = lResult + aCard.email[i][0].join() + sep;
	}
//	lResult = lResult + aCard.title + sep;
//	lResult = lResult + aCard.role + sep;
	lResult = lResult + aCard.org + sep;
//	lResult = lResult + aCard.note + sep;
	lResult = lResult.slice(0, -1);
	return lResult.toUpperCase();
}

////////////////////////////////////////////////////////////////

function nsMsgSendListener(msgId, windowId, msgUri, tmpFile) {
  this.msgId=msgId;
  this.windowId=windowId;
  this.msgUri=msgUri;
  this.tmpFile=tmpFile;
  this.size=tmpFile.fileSize;
}
nsMsgSendListener.prototype = {
  msgId: null,
  windowId: null,
  msgUri: null,
  tmpFile: null,
  size: 0,

  QueryInterface: function(iid) {
    if (iid.equals(Ci.nsIMsgSendListener) ||
        iid.equals(Ci.nsIMsgCopyServiceListener) ||
        iid.equals(Ci.nsISupports)) {
      return this;
    }
    throw Components.results.NS_NOINTERFACE;
  },
  onProgress(msgId, progress, progressMax) {  //not called :-(
debug('onProgress '+progress+' up to  '+progressMax);
  },
  onStartSending(msgId, msgSize) {
    //msgId is null
    //msgSize is always 0 :-(
    if (windows[this.windowId].fire) {
debug('started: notify popup window');
      windows[this.windowId].fire.async({msgid: this.msgId, type: 'started', size: this.size});
    } else {
debug('started: popup window has vanished');
    }
  },
  onStopSending(aMsgID, aStatus, aMsg, returnFileSpec) {
    //aMsgID is empty
debug('nsMsgSendListener.onStopSending '+aMsgID+', '+aStatus +', '+aMsg+', '+returnFileSpec+' '+this.msgUri );
//nsMsgSendListener.onStopSending null, 2153066799, null, null imap-message://ggbs@mailhost.iwf.ing.tu-bs.de/INBOX/Gitti#3085debug('onStopSending status='+aStatus);
    if (aStatus) {
      this.tmpFile.remove(false);
    } else {
      // mark message as 'resent'
      let messenger = Cc["@mozilla.org/messenger;1"].
                      createInstance(Ci.nsIMessenger);
      let msgService = messenger.messageServiceFromURI(this.msgUri);
      let msgHdr = msgService.messageURIToMsgHdr(this.msgUri);

			let msg=appVersion<'85'
				? Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray)
				: new Array();
      if (appVersion<'85') msg.appendElement(msgHdr, false);
			else msg.push(msgHdr);
      try {
        msgHdr.folder.addKeywordsToMessages(msg, "redirected");
      } catch(e) {
debug(e);
      }
//debug('keywords set to: '+msgHdr.getStringProperty("keywords"));
    }
    if (windows[this.windowId].fire) {
debug('finished: notify popup window');
//state=2153066735 if web.de problem
      windows[this.windowId].fire.async({msgid: this.msgId, type: 'finished', state: aStatus});
    } else {
debug('finished: popup window has vanished');
    }
    windows[this.windowId][this.msgId].state='finished';
    windows[this.windowId].msgCount--;
for (const [windowId, data] of Object.entries(windows)) {
  for (const [msgId, mh] of Object.entries(data)) {
    if (isNaN(msgId)) debug(`cache ${windowId} ${msgId} ${mh}`);
    else debug(`cache msgId ${windowId} ${msgId} ${mh.id} ${mh.msgSend} ${mh.subject}`);
  }
}
    if (!windows[this.windowId].msgCount) {
debug('delete windowId '+this.windowId);
      delete windows[this.windowId];
    }

  },
  onGetDraftFolderURI(uri) {	//needed since TB88
debug('onGetDraftFolderURI: uri='+uri.spec);
  },
  onStatus(aMsgID, aMsg) {	//no
debug('nsMsgSendListener.onStatus: msgId='+aMsgID+' msg='+aMsg);
  },
  onSendNotPerformed(aMsgID, aStatus) {	//no
debug('nsMsgSendListener.onSendNotPerformed: msgId='+aMsgID+' status='+aStatus);
  },
  onTransportSecurityError(msgID, status, secInfo, location) {	//no
debug('nsMsgSendListener.onTransportSecurityError');
  }
}

function resentMessage(msgId, windowId, uri, accountId, msgCompFields, identity) {
debug('resentMessage ' + uri);

  let tmpFile = FileUtils.getFile("TmpD", ['tb_simplemailredirection.tmp']);
  tmpFile.createUnique(tmpFile.NORMAL_FILE_TYPE, parseInt("0600", 8));
  if (tmpFile === null) {
debug('temp localfile is null');
    return;
  } else {
debug('writing message to '+tmpFile.path);
  }

  let changeFrom=(prefs.changefrom && prefs.changefrom[accountId+'|'+identity.key]) ?
				prefs.changefrom[accountId+'|'+identity.key]:false;   //workaround web.de
debug('workaround changeFrom for '+accountId+'|'+identity.key+' is '+changeFrom);

  let messenger = Cc["@mozilla.org/messenger;1"].
                  createInstance(Ci.nsIMessenger);
  let aScriptableInputStream = Cc["@mozilla.org/scriptableinputstream;1"].
                               createInstance(Ci.nsIScriptableInputStream);
  let aFileOutputStream = Cc["@mozilla.org/network/file-output-stream;1"].
                          createInstance(Ci.nsIFileOutputStream);

  let inHeader = true;
  let skipping = false;
  let leftovers = "";
  let buf = "";
  let line = "";
  let replyTo='';
  let haveReplyTo=false;
	let lt="";	//line terminator, determined on first call
	let lts;		//size of line terminator

  let aCopyListener = {
    onStartRequest: function(aRequest, aContext) {
    },

    onStopRequest: function(aRequest, aContext, aStatusCode) {
      // write leftovers
      aFileOutputStream.write(leftovers, leftovers.length);
      aFileOutputStream.close();

      if (aStatusCode) {
debug('aCopyListener.onStopRequest failed '+aRequest+', '+aContext+', '+aStatusCode);
        return;
      }
let test=msgCompFields.to.toLowerCase().includes('testggbs@ggbs.de')||
          msgCompFields.to.toLowerCase().includes('ggbstest@ggbs.de')||
          msgCompFields.to.toLowerCase().includes('test@ggbs.de')||
          msgCompFields.to.toLowerCase().includes('ggbs@ggbs.de');
      if (windows[windowId][msgId].state=='abort') {
debug('abort: remove tmpfile');
        tmpFile.remove(false);
        if (windows[windowId].fire) {
          windows[windowId].fire.async({msgid: msgId, type: 'aborted', state: 1});
        } else {
debug('copied: popup window has vanished');
        }
        windows[windowId].msgCount--;
        if (!windows[windowId].msgCount) {
debug('delete windowId '+windowId);
          delete windows[windowId];
        }
        return;
      }
//TEST
debug('file copied to tempfile '+tmpFile.path);
if (test) {
console.log('SMR: TEST mode, no msgSend');  //even if no debug
for (const [windowId, data] of Object.entries(windows)) {
  for (const [msgId, mh] of Object.entries(data)) {
    if (isNaN(msgId)) debug(`cache ${windowId} ${msgId} ${mh}`);
    else debug(`cache msgId ${windowId} ${msgId} ${mh.id} ${mh.msgSend} ${mh.subject}`);
  }
}
windows[windowId][msgId].state='finished';
let m3p=Services.wm.getMostRecentWindow("mail:3pane");
m3p.setTimeout(()=>{
  if (windows[windowId].fire)
    windows[windowId].fire.async({msgid: msgId, type: 'finished', status: 1})
  windows[windowId].msgCount--;
  if (!windows[windowId].msgCount) {
  debug('delete windowId '+windowId);
    delete windows[windowId];
  }
}, 3000);
return;
}

/*obsolete
      let useAccountId=accountId;
      //workaround web.de
      //await messenger.storage.local.set({changeFrom: {account6: false}})
      //await messenger.storage.local.set({useAccount: {account6: 'account3'}}) //send through davbs.de
      if (prefs.useAccount && prefs.useAccount[accountId]) {
        useAccountId=prefs.useAccount[accountId];
      //TODO: useAccountId still valid?
        let account=MailServices.accounts.getAccount(useAccountId);
        identity = account.defaultIdentity;
debug('resent with workaround Account '+useAccountId+' identity='+identity.fullName+' <'+identity.email+'> => sender='+msgCompFields.from);
      } else {
      }
*/
debug('account='+accountId+' identity='+identity.fullName+' <'+identity.email+'> => sender='+msgCompFields.from);

      // send a message
      let msgSendListener = new nsMsgSendListener(msgId, windowId, uri, tmpFile);
      let msgSend = Cc["@mozilla.org/messengercompose/send;1"].
                    createInstance(Ci.nsIMsgSend);
      windows[windowId][msgId].msgSend=msgSend;

//mode: nsMsgDeliverNow, nsMsgQueueForLater, nsMsgDeliverBackground
//msgSend.nsMsgDeliverBackground, msgSend.nsMsgQueueForLater:
// Both put the message in the outbox of local folders
// DeliverBackground should deliver automatically after some seconds
// QueueForLater waits for the user to select 'send messages from outbox now'
// Both does not work. Mail has the resent-headers, but they are not respected by TB

debug('compFields: '+JSON.stringify(msgCompFields));
//      try {
        msgSend.sendMessageFile(
          identity,                        // in nsIMsgIdentity       aUserIdentity,
          accountId,                       // char* accountKey,
          msgCompFields,                   // in nsIMsgCompFields     fields,
          tmpFile,                         // in nsIFile              sendIFile,
          true/*!prefs.debug*/,            // in PRBool               deleteSendFileOnCompletion,
          false,                           // in PRBool               digest_p,
          msgSend.nsMsgDeliverNow,         // in nsMsgDeliverMode     mode,
          null,                            // in nsIMsgDBHdr          msgToReplace,
          msgSendListener,                 // in nsIMsgSendListener   aListener,
          null,                            // in nsIMsgStatusFeedback aStatusFeedback,
          ""                               // in string               password
          );
//      } catch(e) {
//        console.log('SMR: exception when sending message:' + e);
//      }
    },	//end of onStopRequest

    onDataAvailable: function(aRequest, aInputStream, aOffset, aCount) {
//debug('onDataAvailable');
      if (windows[windowId][msgId].state=='abort') {
//debug('onDataAvailable aborted');
//        throw 'aborted';
          //see https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIStreamListener
          //but does not work
        return;
      }

      aScriptableInputStream.init(aInputStream);
      //dumper.dump("!! inHeader reading new buffer, " + aCount + " bytes");
      buf = leftovers + aScriptableInputStream.read(aCount);
			if (!lt) {
				if (buf.indexOf("\r") === -1) {	//probably linefeed only?
					lt="\n";
					lts=1;
debug("Lineending LF (Linux/MacOS)");
				} else {
					lt="\r\n";
					lts=2;
debug("Lineending CR/LF (Windows)");
				}
				// write out Resent-* headers
				let resenthdrs = getResentHeaders(msgCompFields);
debug('resent with account='+accountId+' identity='+identity.fullName+' <'+identity.email+'> => sender='+msgCompFields.from);
				aFileOutputStream.write(resenthdrs, resenthdrs.length);
			}
      if (inHeader) {
        leftovers = "";

        while (buf.length > 0) {
          // find end of line
          let eol = buf.indexOf("\r");	//can't check for lt, since \r and \n might be splitted
					if (eol === -1) {	//probably linefeed only?
						eol = buf.indexOf("\n");
					}

          if (eol === -1) {
            // no end of line character in buffer
            // remember this part for the next time
            leftovers = buf;
            // dumper.dump("leftovers=>>"+leftovers+"<<leftovers_end. length=" + leftovers.length);
            break;
          } else {
            // try a pair of eol chars
						if (lts==2) {
							if (eol + 1 < buf.length) {
								eol++;  // forward to \n
							} else {
								// pair couldn't be found because of end of buffer
								// dumper.dump("pair couldn't be found. end of buf. eol="+eol+" buf.length="+buf.length);
								leftovers = buf;
								break;
							}
						}
            line = buf.substr(0, eol+1-lts);
            buf = buf.substr(eol+1);
            // dumper.dump("line=>>"+line+"<<line_end. length=" + line.length);

//            if (line == lt || line == "\r\n") {	//empty line
            if (line == "") {	//empty line
              if (changeFrom && !haveReplyTo) {
debug('workaround changeFrom: add '+replyTo);
                let ret = aFileOutputStream.write(replyTo+"\r\n", replyTo.length+2);
                if (ret !== replyTo.length+2) {
                  debug("!! inHeader write error? line len "+ replyTo.length + ", written "+ ret);
                }
              }

              aFileOutputStream.write(line+"\r\n", line.length+2);
              inHeader = false;
//debug("End of headers");
              leftovers = buf;
              break;
            }
          }

          if (skipping) {
            if (line[0] === " " || line[0] === "\t") {
              // dumper.dump("forbidden line:" + line+"<<");
              // continue;
            } else {
              skipping = false;
            }
          }

/*workaround web.de*/
          if (changeFrom) {
            if (/^from: /i.test(line)) {
debug('workaround changeFrom: have '+line);
							//if domain of From: address == domain of msgCompFields.from address  => don't change!
							let headerParser = MailServices.headerParser;
							let mf = headerParser.extractHeaderAddressMailboxes(line).split('@')[1];
							let rf = headerParser.extractHeaderAddressMailboxes(msgCompFields.from).split('@')[1];
							debug('parsed From: '+mf+' vs '+rf);
							if (mf==rf) {
								changeFrom=false;	//no need to rewrite from: same mail domain
								debug(' => no need to rewrite from');
							} else {
								replyTo=line.replace(/^[Ff]rom:/, 'Reply-To:') ;  //save for later use
								line="From: "+msgCompFields.from;
debug('workaround changeFrom: rewrite to '+line);
							}
            } else if (/^reply-to: /i.test(line)) {
              haveReplyTo=true;
debug('workaround changeFrom: already have a Reply-To: '+line);
            }
          }
          // remove sensitive headers (vide: nsMsgSendPart.cpp)
          // From_ line format - http://www.qmail.org/man/man5/mbox.html
          if (/^[>]*From \S+ /.test(line) ||
              /^bcc: /i.test(line) ||
              /^resent-bcc: /i.test(line) ||
              /^fcc: /i.test(line) ||
              /^content-length: /i.test(line) ||
              /^lines: /i.test(line) ||
              /^status: /i.test(line) ||
              /^x-mozilla-status(?:2)?: /i.test(line) ||
              /^x-mozilla-draft-info: /i.test(line) ||
              /^x-mozilla-newshost: /i.test(line) ||
              /^x-uidl: /i.test(line) ||
              /^x-vm-\S+: /i.test(line) ||
              /^return-path: /i.test(line) ||
              /^delivered-to: /i.test(line) ||
              /^dkim-signature: /i.test(line) ||			//added, at least necessary if rewritimg the 'From:' header

              // for drafts
              /^FCC: /i.test(line) ||
              /^x-identity-key: /i.test(line) ||
              /^x-account-key: /i.test(line)) {
            skipping = true;            // discard line
debug('removed line: ' + line);
          }

          if (!skipping) {
            let ret = aFileOutputStream.write(line+"\r\n", line.length+2);
            if (ret !== line.length+2) {
              debug("!! inHeader write error? line len "+ line.length + ", written "+ ret);
            }
          }
        }

        if (!inHeader && leftovers !== "") {
          // convert all possible line terminations to CRLF (required by RFC822)
          leftovers = leftovers.replace(/\r\n|\n\r|\r|\n/g, "\r\n");
          ret = aFileOutputStream.write(leftovers, leftovers.length);
          if (ret !== leftovers.length) {
            debug("!! inBody write error? leftovers len " + leftovers.length + ", written " + ret);
          }
          leftovers = "";
        }
      } else {
        // out of header -- read the rest and write to file
        leftovers = "";
        // convert all possible line terminations to CRLF (required by RFC822)
        buf = buf.replace(/\r\n|\n\r|\r|\n/g, "\r\n");
        ret = aFileOutputStream.write(buf, buf.length);
        if (ret !== buf.length) {
          debug("!! inBody write error? buf len " + buf.length + ", written " + ret);
        }
        buf = "";
      }
    } //End of onDataAvailable
  } // End of aCopyListener

  var msgService = messenger.messageServiceFromURI(uri);

  try {
    aFileOutputStream.init(tmpFile, -1, parseInt("0600", 8), 0);
  } catch(e) {
debug('aFileOutputStream.init() failed:' + e);
    return;
  }

  var newURI = {};

  let msgWindow = Cc["@mozilla.org/messenger/msgwindow;1"].createInstance(Ci.nsIMsgWindow);
  msgService.CopyMessage(
      uri,
      aCopyListener,
      false,     // aMoveMessage
      null,      // aUrlListener,
      msgWindow, // msgWindow,
      newURI);

//debug('newURI = '+newURI.value.spec);
  newURI = null;
}

function getResentHeaders(msgCompFields)
{
  //the msgCompFields fields are already quoted printable
  //encodeMimeHeader splits them into multiple lines
  let resenthdrs = encodeMimeHeader("Resent-From: " + msgCompFields.from);
  if (msgCompFields.to) {
    resenthdrs += encodeMimeHeader("Resent-To: " + msgCompFields.to);
  }
  if (msgCompFields.cc) {
    resenthdrs += encodeMimeHeader("Resent-Cc: " + msgCompFields.cc);
  }
//is not in the mails
/*
  if (msgCompFields.bcc) {
    resenthdrs += encodeMimeHeader("Resent-Bcc: " + 'undisclosed recipients');
  }
*/
  if (!msgCompFields.to && !msgCompFields.cc) {
    let composeMsgsBundle = Services.strings.createBundle("chrome://messenger/locale/messengercompose/composeMsgs.properties");
    let undisclosedRecipients = composeMsgsBundle.GetStringFromName("undisclosedRecipients");
    resenthdrs += encodeMimeHeader("Resent-To: " + undisclosedRecipients + ":;" + "\r\n");
  }

  resenthdrs += "Resent-Date: " + getResentDate() + "\r\n";
  if (msgCompFields.messageId) {
    resenthdrs += "Resent-Message-ID: " + msgCompFields.messageId + "\r\n";
  }

//debug('resent-headers\n'+resenthdrs);
  return resenthdrs;
}


function encodeMimePartIIStr_UTF8(aHeader, aFieldNameLen)
{
    return MailServices.mimeConverter.encodeMimePartIIStr_UTF8(
      aHeader, true, aFieldNameLen, Ci.nsIMimeConverter.MIME_ENCODED_WORD_SIZE);
}
function encodeMimeHeader(header)
{
  let fieldNameLen = (header.indexOf(": ") + 2);
  if (header.length <= MAX_HEADER_LENGTH) {
//header is already quoted printable, encodeMimePartIIStr_UTF8 splits them into multiple lines
//    header = header.replace(/\r?\n$/, ""); // Don't encode closing end of line
    return header.substr(0, fieldNameLen) + // and don't encode field name
           encodeMimePartIIStr_UTF8(header.substr(fieldNameLen), fieldNameLen) + "\r\n";
  } else {
//header too long, split into multiple headers(!)
//    header = header.replace(/\r?\n$/, "");
    let fieldName = header.substr(0, fieldNameLen);
    let splitHeader = "";
    let currentLine = "";
    while (header.length > MAX_HEADER_LENGTH - 2) {
      let splitPos = header.substr(0, MAX_HEADER_LENGTH - 2).lastIndexOf(","); // Try to split before MAX_HEADER_LENGTH
      if (splitPos === -1) {
        splitPos = header.indexOf(","); // If that fails, split at first possible position
      }
      if (splitPos === -1) {
        currentLine = header;
        header = "";
      } else {
        currentLine = header.substr(0, splitPos);
        if (header.charAt(splitPos + 1) === " ") {
          header = fieldName + header.substr(splitPos + 2);
        } else {
          header = fieldName + header.substr(splitPos + 1);
        }
      }
      splitHeader += currentLine.substr(0, fieldNameLen) + // Don't encode field name
                     encodeMimePartIIStr_UTF8(currentLine.substr(fieldNameLen), fieldNameLen) + "\r\n";
    }
    splitHeader += header.substr(0, fieldNameLen) + // Don't encode field name
                   encodeMimePartIIStr_UTF8(header.substr(fieldNameLen), fieldNameLen) + "\r\n";
debug('long header: '+splitHeader);
    return(splitHeader);
  }
}


function getResentDate()
{
  let date = new Date();
  let mon=date.toLocaleString('en-US', { month: 'short' });
  let dateTime=date.toLocaleString('en-US', { weekday: 'short' })+', '+
      date.toLocaleString('en-US', { day: 'numeric' })+' '+
      date.toLocaleString('en-US', { month: 'short' })+' '+
      date.toLocaleString('en-US', { year: 'numeric' })+' '+
      date.toLocaleTimeString('de-DE')+' ';
  let offset = date.getTimezoneOffset();
  if (offset < 0) {
    dateTime += "+";
    offset *= -1;
  } else {
    dateTime += "-";
  }
  let minutes = offset % 60;
  offset = (offset - minutes) / 60;
  function twoDigits(aNumber) {
    if (aNumber == 0) {
      return "00";
    }
    return aNumber < 10 ? "0" + aNumber : aNumber;
  }
  dateTime+=twoDigits(offset) + twoDigits(minutes);
debug('resentDate: '+dateTime);
  return dateTime;
}

function stylesheets(context) {
  let styleSheetService = Components.classes["@mozilla.org/content/style-sheet-service;1"]
                                    .getService(Components.interfaces.nsIStyleSheetService);
  let uri = Services.io.newURI(context.extension.getURL("skin/simplemailredirection.css"), null, null);
debug('stylesheet uri='+uri); //fire one time, but
  styleSheetService.loadAndRegisterSheet(uri, styleSheetService.USER_SHEET);
debug('stylesheet loaded');   //this fires two times???
}

let debugcache='';
function debug(txt, force) {
	if (force || prefs) {
		if (force || prefs.debug) {
			if (debugcache) console.log(debugcache); debugcache='';
			console.log('SMR: '+txt);
		}
	} else {
		debugcache+='SMR: '+txt+'\n';
	}
}
