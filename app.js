let scanner;
let scannedData = JSON.parse(localStorage.getItem('scannedData')) || [];
let lastScannedText = null; // เก็บข้อมูลล่าสุด เพื่อป้องกันซ้ำ

// แสดงตารางตอนโหลดหน้า
function renderTable() {
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';
    scannedData.forEach((item, index) => {
        const row = `<tr>
            <td>${index + 1}</td>
            <td>${item.text}</td>
            <td>${item.timestamp}</td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

// บันทึกข้อมูลใหม่ (มีตรวจซ้ำ)
function saveScan(text) {
    const now = new Date().toLocaleString('th-TH');

    // ถ้าข้อมูลเหมือนตัวล่าสุด → แจ้งว่าเคยสแกนแล้ว
    if (text === lastScannedText) {
        alert(`เคยสแกนข้อมูลนี้แล้ว!\nข้อมูล: ${text}\nเวลาเดิม: ${scannedData[scannedData.length - 1].timestamp}`);
        restartScanning(); // ให้กดสแกนใหม่ได้เลย
        return;
    }

    // บันทึกข้อมูลใหม่
    scannedData.push({ text, timestamp: now });
    localStorage.setItem('scannedData', JSON.stringify(scannedData));
    lastScannedText = text;

    renderTable();

    // แสดง Alert ชัดเจน
    alert(`สแกนสำเร็จ!\nข้อมูล: ${text}\nบันทึกเมื่อ: ${now}`);

    // หยุดสแกน + เปลี่ยนปุ่มกลับ
    stopScanning();
}

// กลับไปสถานะพร้อมสแกนใหม่
function restartScanning() {
    document.getElementById('startScan').style.display = 'inline-block';
    document.getElementById('stopScan').style.display = 'none';
    document.getElementById('result').innerHTML = '<span style="color:blue;">กด "เริ่มสแกน" เพื่อสแกนตัวต่อไป</span>';
}

// เมื่อสแกนสำเร็จ
function onScanSuccess(decodedText) {
    console.log("สแกนสำเร็จ:", decodedText);
    saveScan(decodedText.trim()); // ตัดช่องว่างส่วนเกิน
}

function onScanFailure(error) {
    // ซ่อน error ขณะสแกนปกติ
}

// เริ่มสแกน
async function startScanning() {
    scanner = new Html5Qrcode("reader");
    const config = {
        fps: 10,
        qrbox: { width: 300, height: 300 },
        aspectRatio: 1.0,
        formatsToSupport: [ Html5QrcodeSupportedFormats.DATA_MATRIX ]
    };

    try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
            let selectedCamera = devices[0];
            // เลือกกล้องหลังก่อน
            for (let device of devices) {
                if (device.label.toLowerCase().includes("back") || 
                    device.label.toLowerCase().includes("rear") || 
                    device.label.toLowerCase().includes("environment")) {
                    selectedCamera = device;
                    break;
                }
            }

            await scanner.start(selectedCamera.id, config, onScanSuccess, onScanFailure);
            
            document.getElementById('startScan').style.display = 'none';
            document.getElementById('stopScan').style.display = 'inline-block';
            document.getElementById('result').innerHTML = '<span style="color:#007bff;">กำลังสแกน... ชี้กล้องไปที่ Data Matrix</span>';
        }
    } catch (err) {
        alert("ไม่สามารถเปิดกล้องได้: " + err + "\nกรุณาอนุญาตการใช้กล้องในเบราว์เซอร์");
        restartScanning();
    }
}

// หยุดสแกน
function stopScanning() {
    if (scanner) {
        scanner.stop().then(() => {
            scanner = null;
            restartScanning();
        }).catch(err => {
            console.error("หยุดสแกนไม่ได้:", err);
            restartScanning();
        });
    } else {
        restartScanning();
    }
}

// Export CSV
function exportCSV() {
    if (scannedData.length === 0) {
        alert('ยังไม่มีข้อมูลให้ export');
        return;
    }
    let csv = 'ลำดับ,ข้อมูลจากโค้ด,เวลาที่สแกน\n';
    scannedData.forEach((item, index) => {
        csv += `${index + 1},"${item.text.replace(/"/g, '""')}",${item.timestamp}\n`;
    });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'DataMatrix_Scans_' + new Date().toISOString().slice(0,10) + '.csv';
    link.click();
}

// ล้างข้อมูล
function clearData() {
    if (confirm('แน่ใจหรือไม่ที่จะล้างข้อมูลทั้งหมด?')) {
        scannedData = [];
        lastScannedText = null;
        localStorage.removeItem('scannedData');
        renderTable();
        document.getElementById('result').innerText = 'ล้างข้อมูลเรียบร้อย';
    }
}

// Event listeners
document.getElementById('startScan').addEventListener('click', startScanning);
document.getElementById('stopScan').addEventListener('click', stopScanning);
document.getElementById('clearData').addEventListener('click', clearData);
document.getElementById('exportCSV').addEventListener('click', exportCSV);

// โหลดข้อมูลเก่าเมื่อเปิดหน้า
renderTable();
if (scannedData.length > 0) {
    lastScannedText = scannedData[scannedData.length - 1].text;
}
