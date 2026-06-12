// ============================================================
// APLIKASI UPLOAD FOTO V26.1 - SMK Ma'arif 5 Gombong
// Dibuat oleh: IXIA Digital Solution | 2026
// ============================================================


// ── KONFIGURASI UTAMA ────────────────────────────────────────
var DRIVE_FOLDER_ID = "1X5TN87isbc6lkjOOhhPpulqaYoX69JkX";
var SHEET_ID        = "1FuhDaNSwtrzkCTKdyU9ijgadNfCbu-a-vYA0XQaNw8o";
var SHEET_NAME      = "DATA_FOTO";


// Header kolom — ubah di sini jika ingin menambah/mengubah kolom,
// lalu jalankan setupSheet() agar spreadsheet ikut terupdate.
var HEADERS = ["ID", "Nama Penginput", "Nama File", "Tanggal", "Jam", "URL Foto", "File ID"];


// ── ENTRY POINT ──────────────────────────────────────────────
/**
 * doGet: Titik masuk aplikasi web.
 * Merender index.html sebagai HtmlOutput.
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("Aplikasi Upload Foto V26.1 | SMK Ma'arif 5 Gombong")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


// ── SETUP SHEET ──────────────────────────────────────────────
/**
 * setupSheet: Menyiapkan sheet DATA_FOTO secara idempoten.
 * - Membuat sheet jika belum ada.
 * - Memperbarui header baris pertama sesuai array HEADERS.
 * - Mengatur format plain text (@STRING@) pada seluruh kolom data.
 * Aman dijalankan ulang kapan saja tanpa merusak data yang sudah ada.
 */
function setupSheet() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);


  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }


  var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setValues([HEADERS]);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#0a4a4a");
  headerRange.setFontColor("#ffffff");


  var dataRange = sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1000), HEADERS.length);
  dataRange.setNumberFormat("@STRING@");


  sheet.autoResizeColumns(1, HEADERS.length);


  Logger.log("setupSheet selesai. Header: " + HEADERS.join(", "));
  return "setupSheet berhasil dijalankan.";
}


// ── AUTENTIKASI LOGIN ────────────────────────────────────────
/**
 * checkLogin: Memvalidasi username dan password dari Properties Service.
 * Default: admin / smkma5gombong2026
 * Jalankan setDefaultCredentials() sekali dari editor untuk inisialisasi.
 */
function checkLogin(username, password) {
  var props      = PropertiesService.getScriptProperties();
  var storedUser = props.getProperty("APP_USER") || "admin";
  var storedPass = props.getProperty("APP_PASS") || "smkma5gombong2026";


  if (username === storedUser && password === storedPass) {
    return { success: true, message: "Login berhasil." };
  }
  return { success: false, message: "Username atau password salah." };
}


/**
 * setDefaultCredentials: Simpan kredensial default ke Script Properties.
 * Jalankan sekali dari editor Apps Script.
 */
function setDefaultCredentials() {
  var props = PropertiesService.getScriptProperties();
  props.setProperty("APP_USER", "admin");
  props.setProperty("APP_PASS", "smkma5gombong2026");
  Logger.log("Kredensial default telah disimpan.");
}


// ── UPLOAD FOTO (FIXED) ───────────────────────────────────────
/**
 * uploadFoto: Menyimpan file base64 ke Google Drive lalu mencatat ke Sheet.
 *
 * PERBAIKAN v2:
 * 1. Validasi & bersihkan base64 string sebelum decode (strip whitespace/newline
 *    yang bisa muncul akibat transit lewat google.script.run).
 * 2. Blok Drive dan blok Sheet dipisah — jika setSharing gagal (misal izin
 *    folder terbatas), upload tetap dianggap berhasil dan data tetap masuk Sheet.
 * 3. Error message lebih informatif untuk memudahkan debugging.
 *
 * @param {string} base64Data    - Base64 konten file (tanpa prefix "data:...;base64,")
 * @param {string} mimeType      - MIME type, contoh "image/jpeg"
 * @param {string} namaFile      - Nama file
 * @param {string} namaPenginput - Nama penginput
 * @returns {Object} { success, message, data }
 */
function uploadFoto(base64Data, mimeType, namaFile, namaPenginput) {


  // ── 1. Validasi input awal ──────────────────────────────────
  if (!base64Data || base64Data.length < 10) {
    return { success: false, message: "Data foto kosong atau tidak valid. Silakan pilih ulang foto." };
  }
  if (!mimeType || mimeType.indexOf("image/") !== 0) {
    return { success: false, message: "Tipe file tidak valid. Hanya gambar yang diperbolehkan." };
  }
  if (!namaPenginput || !namaFile) {
    return { success: false, message: "Nama penginput dan nama file wajib diisi." };
  }


  // ── 2. Bersihkan base64: hapus whitespace & newline ──────────
  // google.script.run kadang menambahkan karakter tak terlihat pada string panjang.
  var cleanBase64 = base64Data.replace(/\s/g, "");


  // ── 3. Decode base64 → Blob ───────────────────────────────────
  var decoded, blob;
  try {
    decoded = Utilities.base64Decode(cleanBase64);
    blob    = Utilities.newBlob(decoded, mimeType, namaFile);
  } catch (e) {
    return { success: false, message: "Gagal memproses data foto: " + e.message };
  }


  // ── 4. Simpan ke Google Drive ─────────────────────────────────
  var file, fileId, fileUrl;
  try {
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    file       = folder.createFile(blob);
    fileId     = file.getId();
    fileUrl    = "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w800";
  } catch (e) {
    return { success: false, message: "Gagal menyimpan ke Google Drive: " + e.message +
      ". Pastikan folder Drive dapat diakses oleh akun yang menjalankan script." };
  }


  // ── 5. Set sharing (opsional — tidak memblokir flow jika gagal) ─
  // Dipisah dari blok utama agar jika folder sudah punya setting
  // sharing tertentu yang tidak bisa diubah, data tetap tersimpan.
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    // Catat di log tapi lanjutkan — file tetap tersimpan di Drive
    Logger.log("Peringatan setSharing: " + e.message);
  }


  // ── 6. Buat timestamp ─────────────────────────────────────────
  var now      = new Date();
  var tanggal  = Utilities.formatDate(now, "Asia/Jakarta", "dd/MM/yyyy");
  var jam      = Utilities.formatDate(now, "Asia/Jakarta", "HH:mm:ss");
  var uniqueId = "FOTO-" + Utilities.formatDate(now, "Asia/Jakarta", "yyyyMMddHHmmss");


  // ── 7. Simpan metadata ke Spreadsheet ────────────────────────
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);


    // Auto-setup jika sheet belum ada
    if (!sheet) {
      setupSheet();
      sheet = ss.getSheetByName(SHEET_NAME);
    }


    var newRow = [uniqueId, namaPenginput, namaFile, tanggal, jam, fileUrl, fileId];
    var lastRow = sheet.getLastRow() + 1;
    var range   = sheet.getRange(lastRow, 1, 1, newRow.length);
    range.setValues([newRow]);
    range.setNumberFormat("@STRING@");


    // Flush memastikan data langsung ditulis, tidak pending di buffer
    SpreadsheetApp.flush();


  } catch (e) {
    // File Drive sudah tersimpan, tapi Sheet gagal — kembalikan info lengkap
    return {
      success : false,
      message : "Foto tersimpan di Drive (ID: " + fileId + ") tapi gagal dicatat ke Spreadsheet: " + e.message
    };
  }


  // ── 8. Sukses ─────────────────────────────────────────────────
  return {
    success : true,
    message : "Foto berhasil diupload dan dicatat.",
    data    : { id: uniqueId, url: fileUrl, tanggal: tanggal, jam: jam }
  };
}


// ── BACA SEMUA DATA ──────────────────────────────────────────
/**
 * getAllData: Mengambil semua baris data dari sheet (kecuali header).
 * @returns {Array} Array of objects dengan key sesuai HEADERS
 */
function getAllData() {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet || sheet.getLastRow() <= 1) return [];


    var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues();
    return values
      .filter(function(row) { return row[0] !== ""; })
      .map(function(row) {
        var obj = {};
        HEADERS.forEach(function(h, i) { obj[h] = row[i] || ""; });
        return obj;
      });
  } catch (e) {
    return [];
  }
}


// ── HAPUS DATA ───────────────────────────────────────────────
/**
 * hapusData: Menghapus baris data berdasarkan ID dan file dari Drive.
 * @param {string} id - ID unik data
 * @returns {Object} { success, message }
 */
function hapusData(id) {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    var data  = sheet.getDataRange().getValues();


    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        var fileId = data[i][6];
        if (fileId) {
          try { DriveApp.getFileById(fileId).setTrashed(true); } catch (e) { /* file sudah dihapus */ }
        }
        sheet.deleteRow(i + 1);
        return { success: true, message: "Data berhasil dihapus." };
      }
    }
    return { success: false, message: "Data tidak ditemukan." };
  } catch (e) {
    return { success: false, message: "Gagal hapus: " + e.message };
  }
}


// ── EDIT DATA ────────────────────────────────────────────────
/**
 * editData: Memperbarui Nama Penginput dan Nama File berdasarkan ID.
 * @param {string} id            - ID unik data
 * @param {string} namaPenginput - Nama baru penginput
 * @param {string} namaFile      - Nama file baru
 * @returns {Object} { success, message }
 */
function editData(id, namaPenginput, namaFile) {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    var data  = sheet.getDataRange().getValues();


    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.getRange(i + 1, 2).setValue(namaPenginput).setNumberFormat("@STRING@");
        sheet.getRange(i + 1, 3).setValue(namaFile).setNumberFormat("@STRING@");
        return { success: true, message: "Data berhasil diperbarui." };
      }
    }
    return { success: false, message: "Data tidak ditemukan." };
  } catch (e) {
    return { success: false, message: "Gagal edit: " + e.message };
  }
}


// ── STATISTIK DASHBOARD ──────────────────────────────────────
/**
 * getStats: Ringkasan statistik untuk kartu dashboard.
 * @returns {Object} { totalFoto, uploadHariIni, penginputUnik }
 */
function getStats() {
  try {
    var data  = getAllData();
    var today = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy");


    var uploadHariIni = data.filter(function(r) { return r["Tanggal"] === today; }).length;
    var penginput     = {};
    data.forEach(function(r) { if (r["Nama Penginput"]) penginput[r["Nama Penginput"]] = 1; });


    return {
      totalFoto     : data.length,
      uploadHariIni : uploadHariIni,
      penginputUnik : Object.keys(penginput).length
    };
  } catch (e) {
    return { totalFoto: 0, uploadHariIni: 0, penginputUnik: 0 };
  }
}

