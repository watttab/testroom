// ใส่ ID ของ Google Sheet ของคุณที่นี่ (เอามาจาก URL)
const SHEET_ID = "1z_ihu20eXG_DTFk3BBzXfPCGtbNR9dyeNfjCrdpN1lo"; 

function doPost(e) {
  try {
    // เข้าถึง Spreadsheet
    const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    
    // ดึงข้อมูลที่ถูกส่งมาจากเว็บไซต์
    const type = e.parameter.type || "Unknown"; // Pre-test หรือ Post-test
    const name = e.parameter.name || "No Name";
    const score = e.parameter.score || "0";
    const timestamp = e.parameter.timestamp || new Date().toISOString();
    
    // เพิ่มข้อมูลลงในแถวใหม่ (รูปแบบ: วันที่และเวลา, ประเภท, ชื่อ-นามสกุล, คะแนน)
    sheet.appendRow([timestamp, type, name, score]);
    
    // สร้างการตอบกลับกลับไปหาเว็บ
    return ContentService.createTextOutput(JSON.stringify({
      "status": "success", 
      "message": "Data recorded successfully"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // กรณีเกิดข้อผิดพลาด
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error", 
      "message": error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ฟังก์ชันนี้ช่วยให้เว็บอื่นๆ เรียกใช้งาน API ได้ (CORS) แบบ GET
function doGet(e) {
  return ContentService.createTextOutput("API is running").setMimeType(ContentService.MimeType.TEXT);
}
