// Naap Register - Google Sheet backend (Apps Script)
// 1) Change SECRET below to your own long random text.
// 2) Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone.
var SECRET = "my_name_is_khan";
var SHEET_NAME = "Records";
var FIELDS = ["id","updatedAt","deleted","name","phone","date",
  "qameez","bazu","tera","ghera","collar","bain","chest",
  "shalwar","plaza","ghera2","paancha1","paancha2","paancha3","notes",
  "khata","kanda","pajama","pahncha","bazu_style","ghera_style","collar_style","front",
  "pk_front","pk_side","pk_shalwar"]; // new columns are always added at the END so old rows stay aligned

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(SHEET_NAME);
  if (!s) {
    s = ss.insertSheet(SHEET_NAME);
    s.getRange(1, 1, s.getMaxRows(), FIELDS.length).setNumberFormat("@"); // keep text (phone 0300..., dates)
    s.appendRow(FIELDS);
    s.setFrozenRows(1);
  }
  // keep header row in sync when new fields are added later
  var head = s.getRange(1, 1, 1, FIELDS.length).getValues()[0];
  if (head.join("|") !== FIELDS.join("|")) {
    s.getRange(1, 1, s.getMaxRows(), FIELDS.length).setNumberFormat("@");
    s.getRange(1, 1, 1, FIELDS.length).setValues([FIELDS]);
  }
  return s;
}

function readAll_(s) {
  var last = s.getLastRow();
  if (last < 2) return [];
  var vals = s.getRange(2, 1, last - 1, FIELDS.length).getValues();
  return vals.map(function (row) {
    var o = {};
    FIELDS.forEach(function (k, i) { o[k] = row[i] === null ? "" : String(row[i]); });
    o.updatedAt = Number(o.updatedAt) || 0;
    o.deleted = o.deleted === "true";
    return o;
  });
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  if (!e || !e.parameter || e.parameter.key !== SECRET) return out_({ ok: false, error: "bad key" });
  return out_({ ok: true, records: readAll_(getSheet_()) });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.key !== SECRET) return out_({ ok: false, error: "bad key" });
    var s = getSheet_();
    var incoming = body.records || [];
    if (incoming.length) {
      var last = s.getLastRow();
      var ids = last > 1 ? s.getRange(2, 1, last - 1, 2).getValues() : [];
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
    }
    return out_({ ok: true, records: readAll_(s) });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
