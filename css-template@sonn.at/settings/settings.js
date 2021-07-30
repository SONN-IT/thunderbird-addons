let prefs = {};

async function saveSettings() {
    prefs.SonnCss = document.querySelector("#SonnCssInput").value;
    await messenger.storage.local.set(prefs);
}

async function load() {
    prefs = await messenger.storage.local.get({
        SonnCss: [],
    });
    console.log("settings: ", prefs);
    document.getElementById("addressOK").addEventListener('click', saveSettings);

    let SonnCssInput = document.querySelector("#SonnCssInput");
    if (prefs.SonnCss) {
        SonnCssInput.value = prefs.SonnCss;
    }
}

document.addEventListener('DOMContentLoaded', load, {once: true});
