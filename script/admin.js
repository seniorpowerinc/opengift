async function updateGitHub(path, contentBase64, sha, token, message) {
  const url = `https://api.github.com/repos/henry0325/giftcreation/contents/${path}`;
  const body = { message, content: contentBase64, branch: 'main' };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json'
    },
    body: JSON.stringify(body)
  });
  return res.json();
}

document.getElementById('saveBtn').onclick = async () => {
  const statusEl = document.getElementById('status');
  statusEl.textContent = '正在更新…';
  try {
    const token = document.getElementById('token').value.trim();
    const messageText = document.getElementById('message').value.trim();
    const fileInput = document.getElementById('pdfFile');
    if (!token) throw new Error('請輸入 GitHub Token');
    if (!messageText) throw new Error('請輸入 message');
    // --- 1. 先取得 data.json 的 sha
    let dataRes = await fetch('https://api.github.com/repos/henry0325/giftcreation/contents/data.json', {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
    });
    let dataJson = await dataRes.json();
    const dataSha = dataJson.sha;

    // --- 2. 處理 PDF 上傳（若有選檔）
    let pdfPath = dataJson.path; // fallback 使用舊路徑
    if (fileInput.files.length) {
      const file = fileInput.files[0];
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      // 上傳到 pdfs/ 資料夾，用原始檔名
      const pdfFilename = encodeURIComponent(file.name);
      pdfPath = `pdfs/${pdfFilename}`;
      // 取得舊 PDF sha（若存在）
      let oldSha = null;
      const getOld = await fetch(`https://api.github.com/repos/henry0325/giftcreation/contents/${pdfPath}`, {
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
      });
      if (getOld.ok) {
        const oldJson = await getOld.json();
        oldSha = oldJson.sha;
      }
      await updateGitHub(pdfPath, base64, oldSha, token, `Update PDF ${file.name}`);
    }

    // --- 3. 更新 data.json
    const newData = { message: messageText, pdf: pdfPath };
    const newDataBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(newData, null, 2))));
    await updateGitHub('data.json', newDataBase64, dataSha, token, 'Update data.json via admin');

    statusEl.textContent = '✅ 更新完成！請稍候 GitHub Pages 自動部署生效';
  } catch (err) {
    console.error(err);
    statusEl.textContent = '❌ 發生錯誤：' + err.message;
  }
};
