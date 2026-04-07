// ============================================================
// APLIKASI MUTASI SISWA - SMP N 1 SEMPOR
// Code.gs - Backend Google Apps Script
// ============================================================

const SPREADSHEET_ID = '1KS7fD1fCShuUWLhjrIe_kMhr_owsMAmN5qJ19QeDWmY';
const FOLDER_ID = '19R9Aazx59LKp_t1ugmoxF51_91cIjAbV';
const SHEET_NAME = 'MutasiSiswa';

const HEADERS = [
  'Timestamp',
  'NIS',
  'Nama Siswa',
  'Jenis Kelamin',
  'Kelas',
  'Jenis Mutasi',
  'Asal Sekolah',
  'Sekolah Tujuan',
  'Alasan Mutasi',
  'Tanggal Mutasi',
  'Nama Orang Tua',
  'Nomor HP',
  'Alamat',
  'Status Dokumen',
  'Catatan Admin'
];

// ============================================================
// ENTRY POINT
// ============================================================

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Aplikasi Mutasi Siswa - SMP N 1 Sempor')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

// ============================================================
// SETUP DATABASE
// ============================================================

function setupDatabase() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      Logger.log('Sheet baru dibuat: ' + SHEET_NAME);
    }

    updateHeaders();
    Logger.log('Setup database selesai.');
    return { success: true, message: 'Database berhasil disetup.' };
  } catch (e) {
    Logger.log('Error setupDatabase: ' + e.toString());
    return { success: false, message: e.toString() };
  }
}

function updateHeaders() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return setupDatabase();

    var currentHeaders = [];
    if (sheet.getLastColumn() > 0) {
      currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    }

    // Add missing headers
    HEADERS.forEach(function(header, index) {
      if (currentHeaders.indexOf(header) === -1) {
        var col = sheet.getLastColumn() + 1;
        sheet.getRange(1, col).setValue(header);
      }
    });

    // Format header row
    if (sheet.getLastColumn() > 0) {
      var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setBackground('#1a73e8');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      headerRange.setFontSize(11);
    }

    // Format columns for plain text
    updateColumns();

    Logger.log('Headers diperbarui.');
    return { success: true };
  } catch (e) {
    Logger.log('Error updateHeaders: ' + e.toString());
    return { success: false, message: e.toString() };
  }
}

function updateColumns() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return;

    // Set all columns as plain text to prevent leading zero loss
    var maxRows = Math.max(sheet.getMaxRows(), 100);
    sheet.getRange(1, 1, maxRows, HEADERS.length).setNumberFormat('@');

    // Auto resize columns
    for (var i = 1; i <= HEADERS.length; i++) {
      sheet.autoResizeColumn(i);
    }

    // Freeze header row
    sheet.setFrozenRows(1);

    Logger.log('Columns diperbarui.');
  } catch (e) {
    Logger.log('Error updateColumns: ' + e.toString());
  }
}

// ============================================================
// READ DATA
// ============================================================

function getAllData() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      setupDatabase();
      return { success: true, headers: HEADERS, data: [] };
    }

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow <= 1 || lastCol === 0) {
      return { success: true, headers: HEADERS, data: [] };
    }

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var rawData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    var data = rawData.map(function(row, rowIndex) {
      var obj = { _rowIndex: rowIndex + 2 };
      headers.forEach(function(h, i) {
        obj[h] = row[i] !== undefined && row[i] !== null ? String(row[i]) : '';
      });
      return obj;
    }).filter(function(row) {
      return row['NIS'] || row['Nama Siswa'];
    });

    return { success: true, headers: headers, data: data };
  } catch (e) {
    Logger.log('Error getAllData: ' + e.toString());
    return { success: false, message: e.toString(), data: [] };
  }
}

// ============================================================
// CREATE DATA
// ============================================================

function addData(formData) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      setupDatabase();
      sheet = ss.getSheetByName(SHEET_NAME);
    }

    var timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    formData['Timestamp'] = timestamp;

    var row = HEADERS.map(function(h) {
      return formData[h] !== undefined ? String(formData[h]) : '';
    });

    sheet.appendRow(row);

    // Ensure plain text format on new row
    var newRowNum = sheet.getLastRow();
    sheet.getRange(newRowNum, 1, 1, HEADERS.length).setNumberFormat('@');

    return { success: true, message: 'Data berhasil ditambahkan.' };
  } catch (e) {
    Logger.log('Error addData: ' + e.toString());
    return { success: false, message: e.toString() };
  }
}

// ============================================================
// UPDATE DATA
// ============================================================

function updateData(rowIndex, formData) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) return { success: false, message: 'Sheet tidak ditemukan.' };

    var row = HEADERS.map(function(h) {
      return formData[h] !== undefined ? String(formData[h]) : '';
    });

    sheet.getRange(rowIndex, 1, 1, HEADERS.length).setValues([row]);
    sheet.getRange(rowIndex, 1, 1, HEADERS.length).setNumberFormat('@');

    return { success: true, message: 'Data berhasil diperbarui.' };
  } catch (e) {
    Logger.log('Error updateData: ' + e.toString());
    return { success: false, message: e.toString() };
  }
}

// ============================================================
// DELETE DATA
// ============================================================

function deleteData(rowIndex) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) return { success: false, message: 'Sheet tidak ditemukan.' };

    sheet.deleteRow(rowIndex);
    return { success: true, message: 'Data berhasil dihapus.' };
  } catch (e) {
    Logger.log('Error deleteData: ' + e.toString());
    return { success: false, message: e.toString() };
  }
}

// ============================================================
// GET STATS
// ============================================================

function getStats() {
  try {
    var result = getAllData();
    if (!result.success) return { success: false };

    var data = result.data;
    var masuk = data.filter(function(d) { return d['Jenis Mutasi'] === 'Masuk'; }).length;
    var keluar = data.filter(function(d) { return d['Jenis Mutasi'] === 'Keluar'; }).length;
    var total = data.length;

    var perKelas = {};
    data.forEach(function(d) {
      var kelas = d['Kelas'] || 'Tidak Diketahui';
      perKelas[kelas] = (perKelas[kelas] || 0) + 1;
    });

    return {
      success: true,
      masuk: masuk,
      keluar: keluar,
      total: total,
      perKelas: perKelas
    };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ============================================================
// CREDENTIALS (SIMPLE AUTH)
// ============================================================

function verifyLogin(username, password) {
  // Ganti username/password sesuai kebutuhan sekolah
  var credentials = [
    { username: 'admin', password: 'spensapor2026' },
    { username: 'tata_usaha', password: 'tu2026' },
    { username: 'kepala_sekolah', password: 'kepsek2026' }
  ];

  var found = credentials.find(function(c) {
    return c.username === username && c.password === password;
  });

  if (found) {
    return { success: true, message: 'Login berhasil.', role: username };
  }
  return { success: false, message: 'Username atau password salah.' };
}

// ============================================================
// REKAP DATA (FILTERED)
// ============================================================

function getRekapData(filters) {
  try {
    var result = getAllData();
    if (!result.success) return result;

    var data = result.data;

    // Apply filters
    if (filters.tanggalAwal) {
      var tAwal = new Date(filters.tanggalAwal);
      data = data.filter(function(d) {
        var tgl = new Date(d['Tanggal Mutasi']);
        return !isNaN(tgl) ? tgl >= tAwal : true;
      });
    }

    if (filters.tanggalAkhir) {
      var tAkhir = new Date(filters.tanggalAkhir);
      tAkhir.setHours(23, 59, 59);
      data = data.filter(function(d) {
        var tgl = new Date(d['Tanggal Mutasi']);
        return !isNaN(tgl) ? tgl <= tAkhir : true;
      });
    }

    if (filters.kelas) {
      data = data.filter(function(d) { return d['Kelas'] === filters.kelas; });
    }

    if (filters.jenisMutasi) {
      data = data.filter(function(d) { return d['Jenis Mutasi'] === filters.jenisMutasi; });
    }

    if (filters.statusDokumen) {
      data = data.filter(function(d) { return d['Status Dokumen'] === filters.statusDokumen; });
    }

    if (filters.search) {
      var s = filters.search.toLowerCase();
      data = data.filter(function(d) {
        return (d['Nama Siswa'] || '').toLowerCase().includes(s) ||
               (d['NIS'] || '').toLowerCase().includes(s);
      });
    }

    // Summary
    var masuk = data.filter(function(d) { return d['Jenis Mutasi'] === 'Masuk'; }).length;
    var keluar = data.filter(function(d) { return d['Jenis Mutasi'] === 'Keluar'; }).length;

    var perKelas = {};
    var perStatus = {};
    data.forEach(function(d) {
      var kelas = d['Kelas'] || '-';
      perKelas[kelas] = (perKelas[kelas] || 0) + 1;
      var status = d['Status Dokumen'] || '-';
      perStatus[status] = (perStatus[status] || 0) + 1;
    });

    return {
      success: true,
      data: data,
      summary: {
        total: data.length,
        masuk: masuk,
        keluar: keluar,
        perKelas: perKelas,
        perStatus: perStatus
      }
    };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}
