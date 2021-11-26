let prefs = {};
let tags = ["defaultHashTag", "hashTag2"];

async function saveSettings() {
    tags.forEach(item => {
        prefs.hashTags[item] = document.querySelector("#" + CSS.escape(item) + "Input").value;
    });
    await messenger.storage.local.set(prefs);
}

function validate(ev) {
    const re = /^[^#@]{1,100}$/;
    let hashtag = ev.target.value;
    console.log("validate elem", hashtag);
    if (!hashtag) {
        ev.target.className = 'hashtag valid';
    }
    else if (re.test(hashtag)) {
        ev.target.className = 'hashtag valid';
    } else {
        ev.target.className = 'hashtag invalid';
    }

    let i = document.getElementsByClassName('hashtag invalid').length;
    let v = document.getElementsByClassName('hashtag valid').length;
    if (i || !v) {
        document.getElementById('hashTagOK').disabled = true;
    } else {
        document.getElementById('hashTagOK').disabled = false;
    }
}

async function load() {
    prefs = await messenger.storage.local.get({
        hashTags: [],
    });
    console.log("load settings: ", prefs);
    document.getElementById("hashTagOK").addEventListener('click', saveSettings);

    tags.forEach(item => {
        let hashTagInput = document.querySelector("#" + CSS.escape(item) + "Input");
        let prefSetting = prefs.hashTags[item];
        hashTagInput.value = "";
        if (prefSetting) {
            console.log("prefSetting:", prefSetting);
            hashTagInput.value = prefs.hashTags[item];
        }

        hashTagInput.addEventListener("input", validate);
    });
    console.log("test changefrom: ", Object.values(prefs.hashTags));
}


document.addEventListener('DOMContentLoaded', load, {once: true});
