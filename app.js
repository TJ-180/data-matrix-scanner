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
        return false;
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

// โหมดถ่ายรูป + detect กรอบด้วย OpenCV.js (ใหม่!)
document.getElementById('takePhoto').addEventListener('click', () => {
    document.getElementById('photoInput').click();
});

document.getElementById('photoInput').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const preview = document.getElementById('photoPreview');
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';

    document.getElementById('result').innerHTML = '<span style="color:orange;">กำลัง detect กรอบ Data Matrix...</span>';

    // สร้าง Image element เพื่อ load ภาพ
    const img = new Image();
    img.src = preview.src;
    img.onload = async () => {
        try {
            // ใช้ OpenCV.js เพื่อ detect กรอบ
            let src = cv.imread(img);
            let gray = new cv.Mat();
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
            cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
            let edges = new cv.Mat();
            cv.Canny(gray, edges, 75, 200);

            let contours = new cv.MatVector();
            let hierarchy = new cv.Mat();
            cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

            let largestContour = null;
            let maxArea = 0;
            for (let i = 0; i < contours.size(); ++i) {
                let cnt = contours.get(i);
                let approx = new cv.Mat();
                cv.approxPolyDP(cnt, approx, 0.02 * cv.arcLength(cnt, true), true);
                if (approx.rows === 4) { // เป็นสี่เหลี่ยม
                    let area = cv.contourArea(cnt);
                    if (area > maxArea && area > 1000) { // ขนาดเหมาะสม (ปรับค่าได้)
                        maxArea = area;
                        largestContour = cnt;
                    }
                }
                approx.delete();
            }

            if (largestContour) {
                let boundingRect = cv.boundingRect(largestContour);
                let cropped = src.roi(boundingRect); // Crop ภาพ

                // แปลง cropped Mat เป็น ImageData สำหรับ canvas
                let canvas = document.createElement('canvas');
                cv.imshow(canvas, cropped);

                // สแกน Data Matrix จาก cropped image
                const html5QrCode = new Html5Qrcode("reader");
                const result = await html5QrCode.scanFile(fileFromCanvas(canvas), false);
                if (result && saveScan(result.trim())) {
                    document.getElementById('result').innerHTML = '<span style="color:green;">พบและสแกน Data Matrix สำเร็จ!</span>';
                } else {
                    document.getElementById('result').innerHTML = '<span style="color:red;">พบกรอบแต่สแกนไม่ได้ ลองถ่ายใหม่</span>';
                }

                cropped.delete();
            } else {
                // ถ้าไม่พบกรอบ ลองสแกนภาพทั้งใบปกติ
                const html5QrCode = new Html5Qrcode("reader");
                const result = await html5QrCode.scanFile(file, false);
                if (result && saveScan(result.trim())) {
                    document.getElementById('result').innerHTML = '<span style="color:green;">สแกนสำเร็จจากภาพทั้งใบ</span>';
                } else {
                    document.getElementById('result').innerHTML = '<span style="color:red;">ไม่พบ Data Matrix ในภาพ ลองซูมใกล้ขึ้น</span>';
                }
            }

            // ล้าง memory
            src.delete();
            gray.delete();
            edges.delete();
            contours.delete();
            hierarchy.delete();
            if (largestContour) largestContour.delete();

        } catch (err) {
            document.getElementById('result').innerHTML = '<span style="color:red;">เกิดข้อผิดพลาด: ' + err + '</span>';
            console.error(err);
        }
    };

    // ฟังก์ชันช่วย: แปลง canvas เป็น File สำหรับ scanFile
    function fileFromCanvas(canvas) {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(new File([blob], "cropped.png", { type: "image/png" }));
            });
        });
    }

    event.target.value = '';
});

// ปุ่มอื่นๆ (เหมือนเดิม)
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
