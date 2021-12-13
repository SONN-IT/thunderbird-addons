// This Source Code Form is subject to the terms of the
// GNU General Public License, version 3.0.
var { AppConstants } = ChromeUtils.import("resource://gre/modules/AppConstants.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var MSG_VIEW_FLAG_DUMMY = 0x20000000;

const subjectDateColumnHandler = {
  init(win) { this.win = win; },
  getCellText(row, col) { return this.isDummy(row) ? "" : this.getDateString(this.win.gDBView.getMsgHdrAt(row)); },
  getSortStringForRow(hdr) {
    return 0;
  },
  isString() { return false; },
  getCellProperties(row, col, props) {},
  getRowProperties(row, props) {},
  getImageSrc(row, col) { return null; },
  getSortLongForRow(hdr) {
    let dateString = this.getDateString(hdr);
    if (dateString === "") {
      // 1. January 2200 13:37:07
      return 7258167427;
    } else if (dateString === "keine Frist") {
      // 1. January 2200 13:37:00
      return 7258167420;
    }

    let dmy = dateString.split(".");
    // (dmy[1]) - 1: because JavaScript counts months from 0
    return new Date(dmy[2], dmy[1] - 1, dmy[0]).valueOf() / 1000;
  },
  getDateString(aHeader) {
    let dateString = "";
    if(aHeader.mime2DecodedSubject) {
      // extension import-export-tools-ng uses mime2DecodedSubject
      dateString = aHeader.mime2DecodedSubject;
      // let match = dateString.match(/(3[01]|[12][0-9]|0?[1-9])\.(1[012]|0?[1-9])\.((?:19|20)\d{2})/);
      let match = dateString.match(/(3[01]|[12][0-9]|0?[1-9])\.(1[012]|0?[1-9])\.((?:19|20)\d{2})|(3[01]|[12][0-9]|0?[1-9]).?\s?([a-zA-Z]+).?((?:19|20)\d{2})|(keine Frist)/);
      if (match == null) {
        return dateString = "";
      }
      // number month
      if (match[1] && match[2] && match[3]) {
        dateString = match[1].padStart(2,0) + "." +  match[2].padStart(2,0) + "." + match[3];
      // name month
      } else if (match[4] && match[5] && match[6]) {
        let months = {
          'Jänner' : '01', 'Januar' : '01',
          'Februar' : '02',
          'März' : '03',
          'April' : '04',
          'Mai' : '05',
          'Juni' : '06',
          'Juli' : '07',
          'August' : '08',
          'September' : '09',
          'Oktober' : '10',
          'November' : '11',
          'Dezember' : '12'
        }

        let month = match[5];
        if (!months[month]) {
          return "";
        }

        dateString = match[4].padStart(2,0) + "." +  months[month] + "." + match[6];
      } else if (match[7]) {
        return "keine Frist";
      }
    }
    return dateString;
    },
  isDummy(row) { return (this.win.gDBView.getFlagsAt(row) & MSG_VIEW_FLAG_DUMMY) != 0; }
};

const columnOverlay = {
  init(win) {
    this.win = win;
    this.addColumns(win);
  },

  destroy() {
    this.destroyColumns();
  },

  observe(aMsgFolder, aTopic, aData) {
    try {
      console.log("sujectDate observe");
      subjectDateColumnHandler.init(this.win);
      this.win.gDBView.addColumnHandler("subjectDateColumn", subjectDateColumnHandler);
    } catch (ex) {
      console.error(ex);
      throw new Error("Cannot add column handler");
    }
  },

  addColumn(win, columnId, columnLabel) {
    if (win.document.getElementById(columnId)) {
      console.log("exit addColumn");
      return;
    }

    const threadCols = win.document.getElementById("threadCols");
    let ordinals = [];
    let treecols = threadCols.querySelectorAll("treecol");
    treecols.forEach((elem) => {
      ordinals.push(elem.ordinal)
    });
    let nextOrdinal = (Math.max(...ordinals) + 1 || "").toString();

    const treeCol = win.document.createXULElement("treecol");
    treeCol.setAttribute("id", columnId);
    treeCol.setAttribute("persist", "hidden ordinal sortDirection width");
    treeCol.setAttribute("flex", "2");
    treeCol.setAttribute("closemenu", "none");
    treeCol.setAttribute("label", columnLabel);
    treeCol.setAttribute("ordinal", nextOrdinal);
    treeCol.setAttribute("hidden", true);
    treeCol.setAttribute("tooltiptext", "nach Datum im Betreff sortieren");
    threadCols.appendChild(treeCol);

    // Restore persisted attributes.
    let attributes = Services.xulStore.getAttributeEnumerator(
        this.win.document.URL,
        columnId
    );
    for (let attribute of attributes) {
      let value = Services.xulStore.getValue(this.win.document.URL, columnId, attribute);
      // See Thunderbird bug 1607575 and bug 1612055.
      if (attribute != "ordinal" || parseInt(AppConstants.MOZ_APP_VERSION, 10) < 74) {
        treeCol.setAttribute(attribute, value);
      } else if (attribute == "ordinal" && ordinals.indexOf(value) > -1) {
        treeCol.ordinal = nextOrdinal;
        treeCol.setAttribute("ordinal", nextOrdinal);
      } else {
        treeCol.ordinal = value;
      }
    }

    let subjectDateColumn = win.document.getElementById("subjectDateColumn");
    if (!subjectDateColumn.ordinal) {
      treeCol.ordinal = nextOrdinal;
    } else if (ordinals.indexOf(subjectDateColumn.ordinal) > -1) {
      subjectDateColumn.ordinal = nextOrdinal;
      subjectDateColumn.setAttribute("ordinal", nextOrdinal);
    }
    Services.obs.addObserver(this, "MsgCreateDBView", false);
  },

  addColumns(win) {
    console.log("add subjectDate Column");
    this.addColumn(win, "subjectDateColumn", "Betreff-Datum");
  },

  destroyColumn(columnId) {
    console.log("destroyColumn");
    const treeCol = this.win.document.getElementById(columnId);
    if (!treeCol) return;
    treeCol.remove();
  },

  destroyColumns() {
    this.destroyColumn("subjectDateColumn");
    Services.obs.removeObserver(this, "MsgCreateDBView");
  },
};

var FACHeaderView = {
  init(win) {
    console.log("FACHeaderView init");
    this.win = win;
    columnOverlay.init(win);

    // Usually the column handler is added when the window loads.
    // In our setup it's added later and we may miss the first notification.
    // So we fire one ourserves.
    if (win.gDBView && win.document.documentElement.getAttribute("windowtype") == "mail:3pane") {
      Services.obs.notifyObservers(null, "MsgCreateDBView");
    }
  },

  destroy() {
    columnOverlay.destroy();
  },
};
