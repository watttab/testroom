// ใส่ ID ของ Google Sheet ของคุณที่นี่ (เอามาจาก URL)
const SHEET_ID = "1z_ihu20eXG_DTFk3BBzXfPCGtbNR9dyeNfjCrdpN1lo"; 

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    
    const type = e.parameter.type || "Unknown"; // Pre-test หรือ Post-test
    const name = e.parameter.name || "No Name";
    const p1 = e.parameter.p1 || "0";
    const p2 = e.parameter.p2 || "0";
    const total = e.parameter.total || "0";
    const timestamp = e.parameter.timestamp || new Date().toISOString();
    
    // รูปแบบตาราง: [เวลา, ประเภทการสอบ, ชื่อ-สกุล, ตอน1, ตอน2, รวม]
    sheet.appendRow([timestamp, type, name, p1, p2, total]);
    
    return ContentService.createTextOutput(JSON.stringify({
      "status": "success", 
      "message": "Data recorded successfully"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error", 
      "message": error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    const data = sheet.getDataRange().getValues(); // ดึงข้อมูลทั้งหมด
    
    // แปลง 2D Array ให้กลายเป็น Array of Objects แบบง่ายๆ
    const result = [];
    // เริ่มที่ i = 0 เผื่อว่าบางคนไม่ทำ Header ถ้ามี Header จะติดมาด้วย (เดี๋ยวไปกรองหน้าเว็บ)
    for (let i = 0; i < data.length; i++) {
      if(data[i][1] === "Pre-test" || data[i][1] === "Post-test") {
        result.push({
          timestamp: data[i][0],
          type: data[i][1],
          name: data[i][2],
          p1: data[i][3],
          p2: data[i][4],
          total: data[i][5]
        });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      "status": "success",
      "data": result
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error", 
      "message": error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
