let scanner;
let scannedData = JSON.parse(localStorage.getItem('scannedData')) || [];
let lastScannedText = null;

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

function saveScan(text) {
    const now = new Date().toLocaleString('th-TH');

    if (text === lastScannedText) {
        alert(`เคยสแกนข้อมูลนี้แล้ว!\nข้อมูล: ${text}`);
        return false; // ไม่บันทึกซ้ำ
    }

    scannedData.push({ text, timestamp: now });
    localStorage.setItem('scannedData', JSON.stringify(scannedData));
    lastScannedText = text;
    renderTable();

    alert(`สแกนสำเร็จ!\nข้อมูล: ${text}\nบันทึกเมื่อ: ${now}`);
    return true;
}

// โหมด Real-time (เดิม)
async function startScanning() {
    scanner = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 300, height: 300 }, formatsToSupport: [ Html5QrcodeSupportedFormats.DATA_MATRIX ] };

    try {
        const devices = await Html5Qrcode.getCameras();
        let selectedCamera = devices.find(d => d.label.toLowerCase().includes("back")) || devices[0];
        
        await scanner.start(selectedCamera.id, config, (decodedText) => {
            if (saveScan(decodedText.trim())) {
                stopScanning();
            }
        }, () => {});

        document.getElementById('startScan').style.display = 'none';
        document.getElementById('stopScan').style.display = 'inline-block';
        document.getElementById('result').innerHTML = '<span style="color:#007bff;">กำลังสแกน real-time...</span>';
    } catch (err) {
        alert("ไม่สามารถเปิดกล้องได้: " + err);
    }
}

function stopScanning() {
    if (scanner) {
        scanner.stop().then(() => {
            scanner = null;
            document.getElementById('startScan').style.display = 'inline-block';
            document.getElementById('stopScan').style.display = 'none';
            document.getElementById('result').innerHTML = '<span style="color:blue;">กดปุ่มเพื่อสแกนใหม่</span>';
            document.getElementById('photoPreview').style.display = 'none';
        });
    }
}

// โหมดถ่ายรูปแล้วสแกน (ใหม่!)
document.getElementById('takePhoto').addEventListener('click', () => {
    document.getElementById('photoInput').click();
});

document.getElementById('photoInput').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const preview = document.getElementById('photoPreview');
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';

    document.getElementById('result').innerHTML = '<span style="color:orange;">กำลังตรวจสอบภาพ...</span>';

    const html5QrCode = new Html5Qrcode("reader"); // สร้าง instance ใหม่สำหรับสแกนภาพ

    try {
        const result = await html5QrCode.scanFile(file, false); // false = ไม่แสดง overlay
        if (saveScan(result.trim())) {
            document.getElementById('result').innerHTML = '<span style="color:green;">พบ Data Matrix ในภาพ!</span>';
        }
    } catch (err) {
        document.getElementById('result').innerHTML = '<span style="color:red;">ไม่พบ Data Matrix ในภาพนี้<br>ลองถ่ายใหม่หรือซูมให้ชัดกว่านี้</span>';
        console.log("ไม่พบโค้ด:", err);
    }

    // รีเซ็ต input เพื่อให้ถ่ายใหม่ได้
    event.target.value = '';
});

// ปุ่มอื่นๆ
document.getElementById('startScan').addEventListener('click', startScanning);
document.getElementById('stopScan').addEventListener('click', stopScanning);

document.getElementById('clearData').addEventListener('click', () => {
    if (confirm('แน่ใจหรือไม่ที่จะล้างข้อมูลทั้งหมด?')) {
        scannedData = [];
        lastScannedText = null;
        localStorage.removeItem('scannedData');
        renderTable();
        document.getElementById('result').innerText = 'ล้างข้อมูลเรียบร้อย';
    }
});

document.getElementById('exportCSV').addEventListener('click', () => {
    if (scannedData.length === 0) { alert('ยังไม่มีข้อมูล'); return; }
    let csv = 'ลำดับ,ข้อมูลจากโค้ด,เวลาที่สแกน\n';
    scannedData.forEach((item, i) => {
        csv += `${i+1},"${item.text.replace(/"/g, '""')}",${item.timestamp}\n`;
    });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'DataMatrix_' + new Date().toISOString().slice(0,10) + '.csv';
    link.click();
});

renderTable();
if (scannedData.length > 0) {
    lastScannedText = scannedData[scannedData.length - 1].text;
}
