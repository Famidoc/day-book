// ==========================================
// 極簡記帳 - 後端 API (Google Apps Script)
// ==========================================
const BACKEND_VERSION = "1.0.0"; // ★ 新增這行：定義後端版本號

// 處理 GET 請求：前端剛開啟時，向這裡拉取所有歷史紀錄
function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const rows = sheet.getDataRange().getValues();
  
  // 如果只有標題列，回傳空陣列
  if (rows.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = [];
  
  // 從第二列 (i=1) 開始讀取資料
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // 判斷是收入還是支出 (看哪一欄有值)
    const type = row[3] !== '' ? 'income' : 'expense';
    const amount = row[3] !== '' ? row[3] : row[4];
    
    // 確保日期格式為 YYYY-MM-DD，以免前端 <input type="date"> 讀不到
    let formattedDate = '';
    if (row[0]) {
      const d = new Date(row[0]);
      formattedDate = Utilities.formatDate(d, "GMT+8", "yyyy-MM-dd");
    }

    data.push({
      dateVal: formattedDate,
      note: row[1],             // 項目說明
      category: row[2],         // 分類
      type: type,               // 'income' 或 'expense'
      amount: amount,           // 金額
      paymentMethod: row[5],    // 帳戶(支付方式)
      id: row[7]                // 唯一ID
    });
  }
  
  // 回傳 JSON 格式給前端
  return ContentService.createTextOutput(JSON.stringify({ status: 'success',version: BACKEND_VERSION, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

// 處理 POST 請求：前端送出新增、修改、刪除時觸發
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  
  // 解析前端傳來的 JSON 資料
  let requestData;
  try {
    requestData = JSON.parse(e.postData.contents);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: '解析 JSON 失敗' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const action = requestData.action; // 動作：'add', 'update', 'delete'
  const record = requestData.record; // 單筆紀錄物件
  
  // 取得當下的時間作為「記錄時間」
  const timestamp = Utilities.formatDate(new Date(), "GMT+8", "yyyy/MM/dd a hh:mm:ss");

  // ========= 1. 處理「新增」 =========
  if (action === 'add') {
    const incAmount = record.type === 'income' ? record.amount : '';
    const expAmount = record.type === 'expense' ? record.amount : '';
    
    // 依序寫入 9 個欄位
    sheet.appendRow([
      record.dateVal,       // 日期
      record.note,          // 項目說明
      record.category,      // 分類
      incAmount,            // 收入
      expAmount,            // 支出
      record.paymentMethod, // 帳戶
      '',                   // 備註 (暫時留空)
      record.id,            // 唯一ID
      timestamp             // 記錄時間
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ========= 2. 處理「修改」或「刪除」 =========
  if (action === 'update' || action === 'delete') {
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;

    // 尋找對應的 唯一ID (在 H 欄，索引 7)
    for (let i = 1; i < data.length; i++) {
      if (data[i][7] === record.id) {
        rowIndex = i + 1; // 試算表的列數從 1 開始算
        break;
      }
    }

    if (rowIndex !== -1) {
      if (action === 'delete') {
        sheet.deleteRow(rowIndex);
      } else if (action === 'update') {
        const incAmount = record.type === 'income' ? record.amount : '';
        const expAmount = record.type === 'expense' ? record.amount : '';
        
        // 更新整列資料 (覆蓋從 rowIndex列、第1欄 開始，共1列、9欄的範圍)
        sheet.getRange(rowIndex, 1, 1, 9).setValues([[
          record.dateVal,
          record.note,
          record.category,
          incAmount,
          expAmount,
          record.paymentMethod,
          '', // 空備註
          record.id,
          timestamp // 更新時也更新記錄時間
        ]]);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: '找不到該筆紀錄' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
}