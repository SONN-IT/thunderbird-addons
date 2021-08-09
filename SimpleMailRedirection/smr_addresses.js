let prefs={};

var msgs;
var wid;
var msgCount;
var allValid=false;
var sending=false;
var cardbook;	//0: no cardbook, 1: only cardbook, 2: cardbook and TB
var mLists=new Map;
var origAcctId;

let sonnAblageExtras = {
    rangeFromInput: null,
    rangeToInput: null,
    hashtagInput: null,
    validInputs: false
}

function validate(elem) {
    const re=/^(?:.*<)?(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@.+$/i;
    let address=elem.value;
    //debug('validate '+address+' list? '+elem.name);
	if (elem.name && address.toLocaleLowerCase()!=mLists.get(elem.name).lName) elem.name='';	//no longer a valid list
	if (elem.name) {	// a selected list
    elem.className='address valid';
  } else if (!address) {
    elem.className='address empty';
  } else if (re.test(address)) {
    elem.className='address valid';
  } else {
		let found=false;
		mLists.forEach((list, id) => {
			if (address.toLocaleLowerCase()==list.lName) {
				found=true; 
				elem.name=list.id;	//save id of last found list
			}
		});
		if (found) {
			elem.className='address valid';
		} else {
			elem.className='address invalid';
			elem.name='';
		}
	}
  let i=document.getElementsByClassName('address invalid').length;
  let v=document.getElementsByClassName('address valid').length;
  if (i || !v) {
    document.getElementById('addressOK').disabled=true;
		allValid=false;
  } else {
    document.getElementById('addressOK').disabled=false;
		allValid=true;
	}
}

async function okAndInput(ev) {
  if (ev.repeat) {
//debug('key repeated');
    return;
  }
	ev.stopPropagation();
	if (ev.type == "keydown") {
    let sel=document.getElementById('results');
    if (ev.key == "Enter") {
      if (sel) sel.parentNode.removeChild(sel);
      if (ev.target.value) {
        newInput(ev.target);
        validate(ev.target);
      } else if (ev.ctrlKey) {
				if (allValid) send();
			}
    } else if (ev.key=='ArrowDown' || ev.key=='Tab') {
//debug('key down');
      if (sel) {
        sel.focus();
        sel.firstChild.selected=true;
        ev.preventDefault();  //else sel scrolls
      }
    } else if (ev.key == "Escape") {
//debug('cancel (Escape)');
			removeWin();
    }
	}

}

async function send() {
debug('sending messages wid='+wid);
  let sel=document.getElementById('results');
  if (sel) sel.parentNode.removeChild(sel);	//remove search resultsbox if still visible

  let [ acct, iden ]=document.getElementById("accountsel").value.split('|');
debug('Account: '+acct+' '+iden);
  let addresses=[];
  let addr=document.getElementById("address");
  while (addr) {
    let to=addr.firstChild;
    let email=to.nextSibling;
debug('addr: '+to.value+' '+email.value+' '+email.name);
		if (email.name) {
			let list=mLists.get(email.name);
			if (!list.isCB) {
				let contacts=await messenger.mailingLists.listMembers(list.id);
debug('tb contacts: '+JSON.stringify(contacts));
				contacts.forEach(contact=>{
					let email=contact.properties.PrimaryEmail;
					if (email) {
						if (contact.properties.DisplayName)
							email='"'+contact.properties.DisplayName+'" <'+email+'>';
						addresses.push({to: to.value, email: email});
					}
				});
			} else {
				let emails=await messenger.smr.cb_list(list.id);
debug('cb contacts: '+JSON.stringify(emails));
				emails.forEach(email=>{ addresses.push({to: to.value, email: email}); });
			}
		} else {
			if (email.value) addresses.push({to: to.value, email: email.value});
		}
    addr=addr.nextSibling;
  }
  if (!addresses.length || !msgs.length) {
    debug('no addresses or no messages');
    return;
  }
  addresses = [...new Set(addresses)];  //remove duplicates
debug(JSON.stringify(addresses));
//return;	//debug

  msgs.forEach(msg=>{
    msg.sending=true;
debug('msg: '+msg.subject)
  });
  let copy=document.getElementById("copy").checked;
	prefs.copytosent=copy;
debug('copy='+copy);
	prefs.identities[origAcctId]=acct+'|'+iden;
  await messenger.storage.local.set(prefs);

  messenger.smr.redirect(msgs, addresses, 
    {accountId: acct, identityId: iden, copy2sent: copy }, wid, prefs);
  sending=true;
  msgCount=msgs.length;
debug('send done');
  document.getElementById("addressOK").disabled=true;  //disable send button
  let inps=document.getElementsByTagName('input');
  for (let inp of inps) if (inp.type=='text') inp.disabled=true;  //disable all input fields
  
  let trs=document.getElementsByTagName('tr');
  for (let tr of trs) {
    ind=tr.firstChild;
    if (!ind.firstChild) continue;  //skip th row
    ind.className='abort';
    let pbd=document.createElement('div');
    pbd.className='pb';
    let pbs=document.createElement('span');
    pbs.id='pb_'+tr.id.substr(4);
    pbs.textContent='...';
    let pb=document.createElement('progress');
    pbd.appendChild(pbs);
    pbd.appendChild(pb);
    ind.nextSibling.nextSibling.appendChild(pbd);
  }
  document.getElementsByTagName('body')[0].scrollIntoView(
    { block: 'start', inline: 'nearest', behavior: 'smooth'} );
}

async function cancel(e) {
debug('cancel clicked');
  if (sending) {
    msgs.forEach(msg=>{ 
      if (msg.sending) {
debug('abort '+msg.id+' '+msg.subject);
        messenger.smr.abort(wid, Number(msg.id));
      }
    });
  } else {  //its close
		removeWin();
  }
}

function removeMsg(ev) {
  let tr=ev.target.parentNode;
  let msgId=tr.id.substr(4);
  if (!sending) {
debug('remove message '+msgId);
    msgs.splice(msgs.findIndex(msg=>msg.id==msgId), 1);
    tr.parentNode.removeChild(tr);
    msgCount=msgs.length;
    if (!msgs.length) cancel();
  } else {
debug('abort message '+msgId);
    messenger.smr.abort(wid, Number(msgId));
  }
}

async function openAB() {
debug('openAB: cb_exists returns '+await messenger.smr.cb_exists());
	if (await messenger.smr.cb_exists())
		messenger.smr.cb_open();
	else
		messenger.addressBooks.openUI();
}

let listener=function(data) {
debug('onMailSent fired: '+JSON.stringify(data));
  if (data.type=='copied') {  //only on test
    let pbs=document.getElementById('pb_'+data.msgid);
    let size=(Number(data.size)/1000./1000.).toFixed(2);
    size=size+'MB';
    pbs.textContent=size;
  } else if (data.type=='started') {
    let pbs=document.getElementById('pb_'+data.msgid);
    let size=(Number(data.size)/1000./1000.).toFixed(2);
    size=size+'MB';
    pbs.textContent=size;
  } else if (data.type=='finished' || data.type=='aborted') {
    let msg=msgs.find(msg=>msg.id==data.msgid);
    msg.sending=false;
    let tr=document.getElementById('msg_'+data.msgid);
    tr.firstChild.nextSibling.nextSibling.innerHTML='';
    tr.firstChild.removeEventListener('click', removeMsg);
    if (data.state==0) {
      tr.style.color='green';
      tr.firstChild.className='ok';
    } else {
      tr.style.color='red';
      tr.firstChild.className='failed';
    }
    msgCount--;
    if (!msgCount) {
      sending=false;
      document.getElementById("addressCANCEL").value=messenger.i18n.getMessage('close');
    }
  }
}

async function load() {
    wid=(await messenger.windows.getCurrent()).id;
    prefs=await messenger.storage.local.get({
        debug: false,
        size: 0,
        identities: {},
        changefrom: {},
        copytosent: true,
        SonnResentDefaultAddr: []
    });

    //console.log("prefs: ", prefs);

    //dont use storage.local.get() (without arg), see https://thunderbird.topicbox.com/groups/addons/T46e96308f41c0de1
debug('load: wid='+wid+' prefs='+JSON.stringify(prefs));

  if (messenger.smr.onMailSent.hasListener(listener)) {
debug('we already have a listener');
  }
  messenger.smr.onMailSent.addListener(listener, wid);

    document.getElementById("addressCANCEL").addEventListener('click', cancel);
    document.getElementById("addressOK").addEventListener('click', send);
    document.getElementById("email").addEventListener('keydown', okAndInput);
    let email=document.getElementById("email");
    email.addEventListener('drop', drop);
    email.addEventListener('input', search);
    //document.getElementById("ab").addEventListener('click', openAB);
    document.getElementById("deleteAddresses").addEventListener('click', removeResentAddr);
    document.getElementById("extrasAblageButton").addEventListener('click', toggleExtrasAblage);
    document.getElementById("body").addEventListener('keydown', bodykey);
    document.getElementById("accountsel").addEventListener('change', accountchange);
    document.getElementById("changefrom").addEventListener('change', togglechangefrom);
    document.getElementById("debug").addEventListener('change', toggledebug);

    let msgSubjects="";

    msgs = await messenger.runtime.sendMessage({action: "requestData", prefs: prefs});
    let mails=document.getElementById("mails");
    let tbody=mails.firstChild;
    if (tbody.tagName!='tbody') tbody=tbody.nextSibling;
    msgs.forEach(msg=>{
        origAcctId=msg.folder.accountId; //use account from last mail
        // TODO: accounts may be different if mails come from a virtual folder
        msg.sending=false;
        let d=new Date(msg.date);
        let date=d.toLocaleString();
        let tr=document.createElement('tr');
        tr.id="msg_"+msg.id;
        let td=document.createElement('td');
        td.textContent=' ';
        td.className="remove";
        td.addEventListener('click', removeMsg);
        tr.appendChild(td);
        td=document.createElement('td');
        td.textContent=msg.subject;
        tr.appendChild(td);
        td=document.createElement('td');  //progressbar
        td.className='pb';
        tr.appendChild(td);
        td=document.createElement('td');
        td.textContent=msg.author;
        tr.appendChild(td);
        td=document.createElement('td');
        td.textContent=date;
        tr.appendChild(td);
        tbody.appendChild(tr);
        if (msg.subject && msgSubjects.length === 0) {
            msgSubjects += msgSubjects + msg.subject;
        } else if (msg.subject) {
            msgSubjects += msgSubjects + " " + msg.subject;
        }
    });
    await addResentFiles(msgSubjects);

    let ae=document.getElementById('accountsel');
    let accounts;
    try {
        accounts=await messenger.accounts.list();	//array of MailAccount
    } catch(e) {
        console.log('SMR: %-sign in foldernames problem, see bug 1684327');
        const msg='<div style="color: red;"><div style="margin: 2em;">Bitte entfernen sie alle %-Zeichen aus Ordnernamen!<br/>\
Es gibt einen Fehler in Thunderbird, der die Ausführung dieses Add-ons verhindert.<br/>Siehe Bug 1684327</div>\
<div style="margin: 2em;">Please remove any %-signs from foldernames!<br/>\
There is a bug in Thunderbird which prevents this add-on from running.<br/>See Bug 1684327</div></div>';
    const parser = new DOMParser();
    const parsed = parser.parseFromString(msg, 'text/html');
    const tags = parsed.getElementsByTagName('body');
    document.body=tags[0];
    return;
  }

/*
	let defAcct=origAcctId;
  let defIden=await messenger.accounts.getDefaultIdentity(defAcct);
  if (defIden) defIden=defIden.id;
  else {    //no default identity for account
debug(defAcct+': no default identity');
    let acct=await messenger.accounts.get(defAcct);
    let idens=acct.identities;
    if (idens.length) {
debug(defAcct+': use first identity');
      defIden=idens[0].id;  // use first identity
    } else {  // no identities, get identity from default account
debug(defAcct+': no identities');
      defAcct=await messenger.accounts.getDefault();
      if (!defAcct) // if no default account, use first account with identities
        accounts.some(acct=>{ if (acct.identities.length) { defAcct=acct; return true;} });
      defIden=defAcct.identities[0].id;  // use first (=default) identity
      defAcct=defAcct.id;
//debug('using '+defAcct+' '+defIden);
    }
  }
debug('using '+defAcct+' '+defIden);
*/
	let defAcctId, defIdenId;
	let pref=prefs.identities[origAcctId];
	if (pref) {
		let [ acctId, idenId ]=pref.split('|');
debug('from prefs '+acctId+' '+idenId);
//todo: check if acct and iden exists
		let acct=accounts.filter(acct=>acct.id==acctId)[0];
		let iden;
		if (acct) { //ok, account is valid
			iden=acct.identities.filter(iden=>iden.id==idenId)[0];
			if (!iden) {	//identity no longer valid (probably deleted), use default (or first) identity
debug('identity from prefs not valid, use default or first identity');
				iden=acct.identities[0];
			}
			defAcctId=acct.id;
			defIdenId=iden.id;
debug('use from prefs '+defAcctId+' '+defIdenId);
		}
else debug('account from prefs not valid');
	}
	if (!defAcctId) {	//not in prefs or invalid in prefs
        let defaultPref=await messenger.LegacyPrefs.getPref("extensions.smr.defaultResentFrom");
        let acct, iden;
        if (defaultPref) {
            //console.log("legacyPref: ", defaultPref);
            acct=accounts.find(acct=>acct.name==defaultPref);
            iden=acct.identities.find(iden=>iden.email==defaultPref);
        } else {
            acct=accounts.filter(acct=>acct.id==origAcctId)[0];
            iden=acct.identities[0];
        }
        //console.log("iden: ", iden);

		if (iden)	{// is the default identity or at least the first identity
debug('Default Identity: '+iden.id+' in '+iden.accountId);
			defAcctId=acct.id;
			defIdenId=iden.id;
debug('Use Identity: '+defIdenId+' in '+defAcctId);
		} else {	//no identity e.g. local folders
debug('no identity for '+origAcctId);
			for (let i=0; i<accounts.length; i++) {	//find first account with identities
				if (accounts[i].identities.length) {
					defAcctId=accounts[0].id;
					defIdenId=accounts[i].identities[0].id;
debug('first usable acct/iden');
					break;
				}
			}
		}
	}
debug('using '+defAcctId+' '+defIdenId);

  let border=false;
  accounts.forEach(account=>{
    if (account.identities.length) {  //length==0 for local folders
      let bold=true;
      let o;
      account.identities.forEach(identity=>{
        o=document.createElement('option');
        o.value=account.id+'|'+identity.id;
        if (account.id==defAcctId && identity.id==defIdenId) {
          o.selected=true;
					let cf=document.getElementById('changefrom');
					let cfb=document.getElementById('changefrombox');
					cf.value=o.value;
					if (prefs.changefrom[o.value]) {
						cfb.style.display='block';
						cf.checked=true;
					}
				}

//        let a=identity.name+' &lt;'+identity.email+'&gt; ';
        let a=identity.name+' <'+identity.email+'> ';
        if (identity.label) a+='('+identity.label+') ';
//        a+='<span class="acct">'+account.name+'</span>';
        a+=account.name;
//        o.innerHTML=a;                  
        o.textContent=a;                  
        if (bold) {
          o.className='acct';
          if (!border && account.identities.length>1) o.classList.add('bt'); //border-top
        }
        bold=false;
        border=false;
        ae.appendChild(o);
      });
      if (account.identities.length>1) {
        o.classList.add('bb'); //border-bottom
        border=true;
      }
    }
  });

	document.getElementById("copy").checked=prefs.copytosent
	document.getElementById('debug').checked=prefs.debug;

    let body=document.getElementById("body");
    let size=prefs.size;
    if (!size) size=12;
    prefs.size=12;
    body.style.fontSize = size+"px";
    body.style.display = "block";
    //document.getElementById("email").focus();
    document.getElementsByClassName("empty")[0].focus();

    cardbook=await messenger.smr.cb_exists();	//0: no cardbook, 1: only cardbook, 2: cardbook and TB
    debug('cardBook 0=no, 1=yes, 2=both: '+cardbook);

	if (cardbook) {	// get cardbooks mailLists
		let cb_lists=await messenger.smr.cb_list('');
debug('cb_lists: '+JSON.stringify(cb_lists));
		cb_lists.forEach(list=>{
			mLists.set(list.id, {name: list.name, lName: list.name.toLocaleLowerCase(),
                            isCB: true, id: list.id, bcolor: list.bcolor, fcolor: list.fcolor});
		});
	}
	if (!cardbook || cardbook>1) {	// get TB's mailLists
		let abs=await messenger.addressBooks.list();
		for (const ab of abs)	{//ab.id, ab.name
//debug('ab: '+JSON.stringify(ab));
			let mls=await messenger.mailingLists.list(ab.id);
			for (const ml of mls)	{//ml.id, ml.parentId, ml.name, ml.nickName, ml.description
				ml.lName=ml.name.toLocaleLowerCase();
				ml.abName=ab.name;
				ml.isCB=false;
        ml.bcolor='';
        ml.fcolor='';
				mLists.set(ml.id, ml);
//debug('ml: '+JSON.stringify(ml));
			};
		};
	}
//debug('lists: '+mLists.size+' '+JSON.stringify(Array.from(mLists.entries())));
}

function accountchange(ev) {
  let acct=ev.target.value;
debug('account now '+acct);
  let cf=document.getElementById('changefrom');
  let cfb=document.getElementById('changefrombox');
  cf.value=acct;
	if (prefs.changefrom[acct]) {
		cfb.style.display='block';
		cf.checked=true;
	} else {
		cfb.style.display='none';
		cf.checked=false;
	}
}

function togglechangefrom(ev) {
	prefs.changefrom[ev.target.value]=ev.target.checked;
debug('changefrom for '+ev.target.value+' now '+(prefs.changefrom[ev.target.value]?'on':'off'));
debug(JSON.stringify(prefs));
  messenger.storage.local.set(prefs);
}


async function search(ev) {
  let sel=document.getElementById('results');
  validate(ev.target);
	let sv=ev.target.value;
  if (sv.length<2) {
    if (sel) sel.style.display='none';
    return;
  }
	let addresses=[];
	let lists=[];
	let re=new RegExp(sv, 'i');
	for (const list of mLists.values()) {
		if (list.lName.match(re)) {
			lists.push([list.name, list.id, list.bcolor, list.fcolor]);
		}
	};

	if (cardbook)	{	//0: no cardbook, 1: only cardbook, 2: cardbook and TB
		addresses=await messenger.smr.cb_search(sv/*+' @'*/);
	}
	if (!cardbook || cardbook>1) {
		let nodes=await messenger.contacts.quickSearch(null, '"'+sv+'" @');
/*
debug('search: '+sv);
		let nodes=await messenger.contacts.quickSearch(null, sv);
*/
		nodes.forEach(node=>{
//debug('contact: '+JSON.stringify(node));
			if (node.properties.PrimaryEmail)
				addresses.push([node.properties.DisplayName?
					'"'+node.properties.DisplayName+'" <'+node.properties.PrimaryEmail+'>':
					node.properties.PrimaryEmail, '', '']);
			if (node.properties.SecondEmail)
				addresses.push([node.properties.DisplayName?
					'"'+node.properties.DisplayName+'" <'+node.properties.SecondEmail+'>':
					node.properties.SecondEmail, '', '']);
		});
	}
  addresses = [...new Set(addresses)];  //remove duplicates
	addresses=lists.concat(addresses);

//debug('found '+addresses.length);
  if (addresses.length && addresses.length<=20) {
    if (sel) {
      while (sel.firstChild) sel.removeChild(sel.lastChild);
      sel.style.display='block';
    } else {
      sel=document.createElement('select');
      sel.id='results';
      sel.multiple=true;
      sel.autocomplete='off';
      sel.addEventListener('keyup', selectitem);
      sel.addEventListener('click', selectitem);
    }
    sel.size=addresses.length<=5?addresses.length:5;
    addresses.forEach(address =>{
      let opt=document.createElement('option');
			if (address.length==3) {            //email
				opt.text=address[0];
				opt.value='|'+address[0];
        if (address[1]) {
          opt.style.backgroundColor=address[1];
          opt.style.color=address[2];
        }
			} else {                            //list
				opt.text=address[0];
				opt.value=address[1]+'|'+address[0];
        if (address[2]) {
          opt.style.backgroundColor=address[2];
          opt.style.color=address[3];
        }
			}
      sel.appendChild(opt);
    });
    ev.target.parentNode.parentNode.insertBefore(sel, ev.target.parentNode.nextSibling); //appends if no nextSibling
/*
    let offset=document.getElementById("address").offsetTop;
//debug('offset='+offset);
//debug('div.clientHeight='+sel.parentNode.clientHeight+
//'-(input.offsetTop='+sel.previousSibling.offsetTop+
//'+input.offsetHeight='+sel.previousSibling.offsetHeight+
//'+sel.offsetHeight='+sel.offsetHeight+')');
    sel.parentNode.scrollTop = 
      (sel.previousSibling.offsetTop-offset + sel.previousSibling.offsetHeight+sel.offsetHeight)
      - sel.parentNode.clientHeight;
*/
    sel.scrollIntoView(false);
  } else {
    let sel=document.getElementById('results');
    if (sel) sel.style.display='none';
  }
}

function selectitem(ev) {
  if (ev.type == "keyup" && (ev.key == "Enter" || ev.key==" ") || ev.type == 'click') {
		ev.stopPropagation();
    ev.preventDefault();
    let sel=document.getElementById('results');
    let input=sel.previousSibling.firstChild.nextSibling;
    sel.parentNode.removeChild(sel);
		let data=ev.target.value.split('|');
    input.name=data.shift();	//list id or ''
    input.value=data.join('|');
//debug('selected: list='+input.name+' value='+input.value);
    validate(input);
    input.focus();
    newInput(input);
  }
}

function drop(ev) {
  let sel=document.getElementById('results');
  if (sel) sel.style.display='none';
  let address = ev.dataTransfer.getData("text");
  debug('dropped '+address);
  if (!ev.target.value) //else its a replace
    newInput(ev.target);
  ev.target.value=address;
  validate(ev.target);
  ev.preventDefault();
}

function newInput(elem) {
//debug('generate new input field');
  let addr=elem.parentNode; //flex container
  //let to=addr.firstChild.value;
  let to="TO";
  let na=addr.nextSibling;
//debug('newInput next is '+ni);
  if (!na) {
    na=addr.cloneNode(true);
    na.removeAttribute('id');
		na.firstChild.value=to;
    let ni=na.firstChild.nextSibling;
      ni.value='';
			ni.name='';
      ni.className='empty';
      ni.addEventListener('keydown', okAndInput);
      ni.addEventListener('drop', drop);
      ni.addEventListener('input', search);
    addr.parentNode.appendChild(na);
    ni.focus();
  }
  //document.getElementsByTagName('body')[0].scrollIntoView(false);
  document.getElementsByTagName('html')[0].scrollIntoView(false);
}

let hidden='';
async function bodykey(ev) {
  if (ev.repeat) {
//debug('key repeated');
    return;
  }
	if (ev.type == "keydown") {
		let resize=false;
    if (ev.key == "+" && ev.ctrlKey) {
			prefs.size++;
			resize=true;
    } else if (ev.key == "-" && ev.ctrlKey) {
			prefs.size--;
			resize=true;
    } else if (ev.key == "0" && ev.ctrlKey) {
			prefs.size=12;
			resize=true;
    } else if (ev.key == "Enter" && ev.ctrlKey) {
			if (allValid) send();
    } else if (ev.key == "s" && !hidden) {
			hidden='s';
    } else if (ev.key == "m" && hidden=='s') {
			hidden='m';
    } else if (ev.key == "r" && hidden=='m') {
			hidden='';
			document.getElementById('debugbox').style.display='inline-block';
    } else if (ev.key == "r" && !hidden) {
			hidden='r';
    } else if (ev.key == "w" && hidden=='r') {
			hidden='w';
    } else if (ev.key == "f" && hidden=='w') {
			hidden='';
			document.getElementById('changefrombox').style.display='block';
		} else {
			hidden='';
		}
		if (resize) {
			let body=document.getElementById("body");
			let size=prefs.size;
			body.style.fontSize = size+"px";
			hidden='';
		}
	}
}

function toggledebug(ev) {
	prefs.debug=ev.target.checked;
console.log('SMR: debug now '+(prefs.debug?'on':'off'));
  messenger.storage.local.set(prefs);
}

async function removeWin() {
	let win=await messenger.windows.getCurrent();
	let wInfo=await messenger.windows.get(win.id);
	prefs.top=wInfo.top;
	prefs.left=wInfo.left;
	//prefs.height=wInfo.height;
	prefs.width=wInfo.width;
  await messenger.storage.local.set(prefs);
	debug('positioned window now at '+prefs.left+'x'+prefs.top);
	debug('sized window now '+prefs.width+'x'+prefs.height);
	debug('font size now '+prefs.size);

	await messenger.windows.remove(win.id);	
}

document.addEventListener('DOMContentLoaded', load, { once: true });
// window close is recognized by unregister of onMailSent

let debugcache='';
function debug(txt, force) {
    if (force || prefs) {
        if (force || prefs.debug) {
            if (debugcache) console.log(debugcache);
            debugcache='';
            console.log('SMR: '+txt);
        }
    } else {
        debugcache+='SMR: '+txt+'\n';
    }
}

async function addResentFiles(subjects) {
    let fileMatch = subjects.match(/\b(([MRU]\s?\d{4,5}\/[A-Z]{1,2}(?!\/)|J\s?\d{4,5}\/\d{1,3}|[MGURKE]\s?\d{4,5}|S\s?\d{3})(?!-))\b/gi);

    let sentTypes = ["To", "Cc", "Bcc"];
    sentTypes.forEach(sentType => {
        let prefSentItems = prefs.SonnResentDefaultAddr[sentType];
        //console.log("prefSentItems: ", prefSentItems);
        if (!prefSentItems) {
            return;
        }

        let mailAddresses = prefSentItems.split(/,\s?/);
        mailAddresses.forEach(mailAddr => {
            //console.log("mailAddr: ", mailAddr);
            addResentAddr(mailAddr, sentType);
        })
    });

    if (fileMatch) {
        // remove duplicate values
        let uniqueSet = new Set(fileMatch);
        fileMatch = [...uniqueSet];
        for (let m of fileMatch) {
            let fileRaw = m.replace(/ /g, '');
            fileRaw = fileRaw.toLowerCase().substring(0, 1) + fileRaw.toUpperCase().substring(1).padStart(5, '0');
            let file = fileRaw.replace(/\//g, '-') + "@ablage";
            addResentAddr(file);
        }
    }

    let addHeight  = document.querySelectorAll("div.address:not(#address)").length;
    //console.log("addHeight: ", addHeight);
    await changeWindowHeight(addHeight);
}

function addResentAddr(mailAddr, sentType = 0) {
    let mailAddrInput = document.getElementsByClassName("empty")[0];

    // set sentType To,Cc,Bcc
    if (sentType !== 0) {
        //console.log("sentType: ", sentType);
        mailAddrInput.previousSibling.value = sentType.toUpperCase();
    }
    mailAddrInput.value = mailAddr;

    // fake keypress event
    let mailAddr_ev = {
        type: "keydown",
        key: "Enter",
        target: mailAddrInput,
        stopPropagation: function() {}
    };
    okAndInput(mailAddr_ev);
}

async function removeResentAddr() {
    let addr = document.querySelectorAll("div.address:not(#address)");

    if (addr.length > 0) {
        //console.log("addr: ", addr);
        addr.forEach((elem) => elem.remove());
    }

    let firstAddr = document.querySelector("div#address");
    if (firstAddr) {
        let firstAddrMail = firstAddr.firstChild.nextSibling;
        if (firstAddrMail) {
            firstAddrMail.value = "";
            firstAddrMail.className = 'address empty';
            document.getElementById('addressOK').disabled = true;
        }
    }
    document.getElementsByClassName("empty")[0].focus();

    await changeWindowHeight(-addr.length);
}

async function changeWindowHeight(count = 0) {
    let winRedirect = await messenger.windows.getCurrent();
    //console.log("changeWindowHeight Count: ", count);
    let height = winRedirect.height+(count*30);

    // fixed minimal height
    height = height > 300 ? height : 300;

    //console.log("winRedirect height", winRedirect.height);
    await messenger.windows.update(winRedirect.id, {
        height: height
    })
    //console.log("neue Höhe: ", height);
}

function toggleExtrasAblage() {
    let div = document.querySelector("#dropdownAblage");
    //console.log("classList: ", div.classList);
    div.classList.toggle("showDropdown");
    if (div.classList.contains("showDropdown")) {
        document.querySelectorAll('.extrasAblageInput').forEach(elem => {
            elem.addEventListener('input', extrasAblageValidate);
        });
        document.getElementById("extrasAblageSubmit").addEventListener('click', extrasAblage);
    } else {
        document.querySelectorAll('.extrasAblageInput').forEach(elem => {
            elem.removeEventListener('input', extrasAblageValidate);
        });
        document.getElementById("extrasAblageSubmit").removeEventListener('click', extrasAblage);
    }
}

async function extrasAblage(ev) {
    if (!sonnAblageExtras.validInputs) {
        return;
    }

    let hashtag = "";
    if (sonnAblageExtras.hashtagInput !== "") {
        hashtag = "#" + sonnAblageExtras.hashtagInput
    }

    if (sonnAblageExtras.rangeFromInput === "" && sonnAblageExtras.rangeToInput === "") {
        addHashtag(hashtag);
    } else {
        let rangeFrom, rangeTo;
        let fileType = sonnAblageExtras.rangeFromInput.slice(0,1).toLowerCase();
        rangeFrom = sonnAblageExtras.rangeFromInput.slice(1);
        rangeTo = sonnAblageExtras.rangeToInput.slice(1);

        let rangeCount = rangeTo - rangeFrom;
        document.getElementById('extrasAblageSubmit').disabled = rangeCount < 0 || rangeCount > 29;
        if (rangeCount > 29) {
            document.querySelector("#rangeLimit").classList.add("invalid");
            return;
        } else if (rangeCount < 0) {
            document.querySelector("#rangeToInput").classList.add("invalid");
            return;
        }
        document.querySelector("#rangeToInput").classList.remove("invalid");
        document.querySelector("#rangeLimit").classList.remove("invalid");

        let file;
        for (file = rangeFrom; file <= rangeTo; file++) {
            addResentAddr(fileType + file + hashtag + "@ablage");
        }

        let addHeight  = document.querySelectorAll("div.address:not(#address)").length;
        //console.log("addHeight: ", addHeight);
        await changeWindowHeight(addHeight);
    }
    toggleExtrasAblage();
}

async function extrasAblageValidate(ev) {
    // input id's validate input rangeFromInput, rangeToInput, hashtagInput
    let elem = ev.target
    //console.log("validate input", ev.target.id);

    let re = /^\b(([MRU]\s?\d{4,5}\/[A-Z]{1,2}(?!\/)|J\s?\d{4,5}\/\d{1,3}|[MGURKE]\s?\d{4,5}|S\s?\d{3})(?!-))\b$/i;
    if (elem.id === "hashtagInput") {
        // TODO extend regex?
        re = /^[a-zA-Z1-9\-]+$/i;
    }

    if (elem.value === "") {
        elem.classList.remove("invalid");
    } else if (re.test(elem.value)) {
        elem.classList.remove("invalid");
    } else {
        elem.classList.add("invalid");
    }

    let inputInvalidCount = 0;
    let inputRangeCount = 0;
    // input  id's
    let inputFields = ['rangeFromInput', 'rangeToInput', 'hashtagInput'];
    inputFields.forEach(inputField => {
        let domElem = document.querySelector('#' + inputField);

        if (inputField !== "hashtagInput" && domElem.value !== "") {
            inputRangeCount += 1;
        }

        if (domElem.classList.contains("invalid")) {
            inputInvalidCount += 1;
        } else {
            sonnAblageExtras[inputField] = domElem.value;
        }
    })

    // check if only one inputRange field has a value
    if (inputRangeCount === 1 ) {
        inputInvalidCount += 1;
    }

    // set validInputs to true, if inputs are valid
    sonnAblageExtras.validInputs = inputInvalidCount === 0;
    document.getElementById('extrasAblageSubmit').disabled = inputInvalidCount !== 0;
}

function addHashtag(hashtag = "") {
    let addr = document.querySelectorAll("div.address>#email");
    addr.forEach(elem => {
        // check if input is empty or has already a hashtag #
        if (elem.value === "" || elem.value.includes("#")) {
            return;
        }
        let mailAddr = elem.value;
        let idx = mailAddr.lastIndexOf("@");
        if (idx > -1) {
            mailAddr = mailAddr.substr(0, idx) + hashtag + mailAddr.substr(idx);
        }
        elem.value = mailAddr;
    })
}
