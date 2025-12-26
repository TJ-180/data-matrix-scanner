let scanner;
let scannedData = JSON.parse(localStorage.getItem('scannedData')) || []; // โหลดข้อมูลเก่า

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

// บันทึกข้อมูลใหม่
function saveScan(text) {
    const now = new Date().toLocaleString('th-TH');
    scannedData.push({ text, timestamp: now });
    localStorage.setItem('scannedData', JSON.stringify(scannedData));
    renderTable();
    document.getElementById('result').innerHTML = `<strong style="color:green;">บันทึกสำเร็จ!</strong><br>ข้อมูล: ${text}<br>เวลา: ${now}`;
}

// Export CSV
function exportCSV() {
    if (scannedData.length === 0) {
        alert('ยังไม่มีข้อมูลให้ export');
        return;
    }
    let csv = 'ลำดับ,ข้อมูลจากโค้ด,เวลาที่สแกน\n';
    scannedData.forEach((item, index) => {
        csv += `${index + 1},"${item.text}",${item.timestamp}\n`;
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
        localStorage.removeItem('scannedData');
        renderTable();
        document.getElementById('result').innerText = 'ล้างข้อมูลเรียบร้อย';
    }
}

// ฟังก์ชันสแกน (เหมือนเดิม แต่ปรับให้บันทึกอัตโนมัติ)
function onScanSuccess(decodedText) {
    console.log("สแกนสำเร็จ:", decodedText);
    saveScan(decodedText);
    // ไม่หยุดสแกนอัตโนมัติ เพื่อให้สแกนต่อเนื่องได้
}

function onScanFailure(error) {
    // ซ่อน error ขณะสแกน
}

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
            for (let device of devices) {
                if (device.label.toLowerCase().includes("back") || device.label.toLowerCase().includes("environment")) {
                    selectedCamera = device;
                    break;
                }
            }
            await scanner.start(selectedCamera.id, config, onScanSuccess, onScanFailure);
            document.getElementById('startScan').style.display = 'none';
            document.getElementById('stopScan').style.display = 'inline-block';
            document.getElementById('result').innerText = "กำลังสแกน...";
        }
    } catch (err) {
        alert("ไม่สามารถเริ่มสแกนได้: " + err);
    }
}

function stopScanning() {
    if (scanner) {
        scanner.stop();
        document.getElementById('startScan').style.display = 'inline-block';
        document.getElementById('stopScan').style.display = 'none';
        document.getElementById('result').innerText = "หยุดสแกนแล้ว";
    }
}

// Event listeners
document.getElementById('startScan').addEventListener('click', startScanning);
document.getElementById('stopScan').addEventListener('click', stopScanning);
document.getElementById('clearData').addEventListener('click', clearData);
document.getElementById('exportCSV').addEventListener('click', exportCSV);

// โหลดตารางตอนเปิดหน้า
renderTable();