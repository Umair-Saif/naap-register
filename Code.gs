// Naap Register - Google Sheet backend (Apps Script)
// 1) Keep / change SECRET below (same text must be used in the app).
// 2) Deploy > Manage deployments > edit > Version: New version > Deploy.
var SECRET = "CHANGE_THIS_SECRET";
var SHEET_NAME = "Records";

// Column order in the sheet: account number (khata) first, technical columns last.
var FIELDS = ["khata","name","phone","date",
  "qameez","bazu","bazu_style","tera","ghera","ghera_style","collar","collar_style","bain","kanda","front",
  "pk_front","pk_side","pk_shalwar","shalwar","pajama","ghera2","pahncha","notes",
  "id","updatedAt","deleted"];
var IDX = {};
FIELDS.forEach(function (k, i) { IDX[k] = i; });

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  var lastRow = s.getLastRow(), lastCol = s.getLastColumn();
  var head = [];
  if (lastRow > 0 && lastCol > 0) head = s.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  while (head.length && head[head.length - 1] === "") head.pop();

  if (head.join("|") !== FIELDS.join("|")) {
    // (re)build the sheet in the current column order, keeping old rows
    var old = [];
    if (lastRow > 1 && head.length) old = s.getRange(2, 1, lastRow - 1, head.length).getValues();
    var rows = old.map(function (r) {
      var o = {};
      head.forEach(function (k, i) { o[k] = r[i]; });
      return FIELDS.map(function (k) { return o[k] === undefined || o[k] === null ? "" : String(o[k]); });
    });
    s.clear();
    if (s.getMaxColumns() < FIELDS.length) s.insertColumnsAfter(s.getMaxColumns(), FIELDS.length - s.getMaxColumns());
    s.getRange(1, 1, s.getMaxRows(), FIELDS.length).setNumberFormat("@"); // keep text (0300..., dates)
    s.getRange(1, 1, 1, FIELDS.length).setValues([FIELDS]);
    if (rows.length) s.getRange(2, 1, rows.length, FIELDS.length).setValues(rows);
    s.setFrozenRows(1);
  }
  return s;
}

// rows typed by hand in the sheet (no id yet) get an id so the app can see them
function fixRows_(s) {
  var last = s.getLastRow();
  if (last < 2) return false;
  var rng = s.getRange(2, 1, last - 1, FIELDS.length);
  var vals = rng.getValues(), changed = false, now = Date.now();
  vals.forEach(function (row, i) {
    if (String(row[IDX.id]) !== "") return;
    var any = row.some(function (v) { return String(v) !== ""; });
    if (!any) return;
    row[IDX.id] = String(now + i);
    row[IDX.updatedAt] = String(now);
    changed = true;
  });
  if (changed) { rng.setNumberFormat("@"); rng.setValues(vals); }
  return changed;
}

// always ascending by account number (khata); rows without a number go last
function sortSheet_(s) {
  var last = s.getLastRow();
  if (last < 3) return;
  var rng = s.getRange(2, 1, last - 1, FIELDS.length);
  var vals = rng.getValues();
  vals.sort(function (a, b) {
    var x = parseFloat(a[IDX.khata]), y = parseFloat(b[IDX.khata]);
    var xi = isNaN(x) ? Infinity : x, yi = isNaN(y) ? Infinity : y;
    if (xi !== yi) return xi < yi ? -1 : 1;
    return (Number(a[IDX.id]) || 0) - (Number(b[IDX.id]) || 0);
  });
  rng.setNumberFormat("@");
  rng.setValues(vals);
}

function readAll_(s) {
  var last = s.getLastRow();
  if (last < 2) return [];
  var vals = s.getRange(2, 1, last - 1, FIELDS.length).getValues();
  var out = [];
  vals.forEach(function (row) {
    var o = {};
    FIELDS.forEach(function (k, i) { o[k] = row[i] === null || row[i] === undefined ? "" : String(row[i]); });
    if (!o.id) return;
    o.updatedAt = Number(o.updatedAt) || 0;
    o.deleted = o.deleted === "true";
    out.push(o);
  });
  return out;
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  if (!e || !e.parameter || e.parameter.key !== SECRET) return out_({ ok: false, error: "bad key" });
  var s = getSheet_();
  if (fixRows_(s)) sortSheet_(s);
  return out_({ ok: true, records: readAll_(s) });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.key !== SECRET) return out_({ ok: false, error: "bad key" });
    var s = getSheet_();
    fixRows_(s);
    var incoming = body.records || [];
    if (incoming.length) {
      var last = s.getLastRow();
      var ids = last > 1 ? s.getRange(2, IDX.id + 1, last - 1, 2).getValues() : []; // id, updatedAt
      var rowOf = {}, stamp = {};
      ids.forEach(function (r, i) { rowOf[String(r[0])] = i + 2; stamp[String(r[0])] = Number(r[1]) || 0; });
      incoming.forEach(function (rec) {
        var id = String(rec.id);
        var row = FIELDS.map(function (k) {
          if (k === "id") return id;
          if (k === "deleted") return rec.deleted ? "true" : "";
          return rec[k] === undefined || rec[k] === null ? "" : String(rec[k]);
        });
        if (rowOf[id]) {
          if ((Number(rec.updatedAt) || 0) >= stamp[id]) {
            s.getRange(rowOf[id], 1, 1, FIELDS.length).setNumberFormat("@").setValues([row]);
          }
        } else {
          var r = s.getLastRow() + 1;
          s.getRange(r, 1, 1, FIELDS.length).setNumberFormat("@").setValues([row]);
          rowOf[id] = r; stamp[id] = Number(rec.updatedAt) || 0;
        }
      });
      sortSheet_(s);
    }
    return out_({ ok: true, records: readAll_(s) });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// When someone edits the Google Sheet by hand, mark the row as newer so the app picks it up.
function onEdit(e) {
  try {
    var s = e.range.getSheet();
    if (s.getName() !== SHEET_NAME) return;
    var r0 = e.range.getRow(), n = e.range.getNumRows();
    if (r0 + n - 1 < 2) return;
    var now = String(Date.now());
    for (var r = Math.max(r0, 2); r < r0 + n; r++) {
      if (String(s.getRange(r, IDX.id + 1).getValue()) === "") s.getRange(r, IDX.id + 1).setValue(now + r);
      s.getRange(r, IDX.updatedAt + 1).setValue(now);
    }
  } catch (err) {}
}
