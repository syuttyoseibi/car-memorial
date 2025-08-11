document.getElementById('memorial-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'AIが物語を生成中です...';

    const formData = {
        carName: document.getElementById('car-name').value,
        carNickname: document.getElementById('car-nickname').value,
        firstMemory: document.getElementById('first-memory').value,
        memorableDrive: document.getElementById('memorable-drive').value,
        favoriteSong: document.getElementById('favorite-song').value,
        finalWords: document.getElementById('final-words').value,
    };

    try {
        const response = await fetch('/api/generate-story', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });

        if (!response.ok) { throw new Error(`Server error: ${response.statusText}`); }

        const result = await response.json();
        const storyFromServer = result.story;
        const nickname = formData.carNickname || formData.carName.split('・')[1] || formData.carName;

        const photoInput = document.getElementById('car-photo');
        let filesToProcess = Array.from(photoInput.files);

        if (filesToProcess.length > 3) {
            filesToProcess = filesToProcess.slice(0, 3);
        }

        const imageDataUrls = [];
        const readers = filesToProcess.map(file => {
            return new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        });

        const allImageDataUrls = await Promise.all(readers);
        imageDataUrls.push(...allImageDataUrls);

        let imagesHtml = '';
        if (imageDataUrls.length > 0) {
            imagesHtml = '<div id="image-gallery-display">';
            imageDataUrls.forEach(url => {
                imagesHtml += `<img class="memorial-photo" src="${url}">`;
            });
            imagesHtml += '</div>';
        }

        const storyHTML = `
            <div id="memorial-content">
                <h2 class="memorial-title">${nickname}との物語</h2>
                <p class="memorial-subtitle">君と走った道のりは、永遠に</p>
                ${imagesHtml}
                <div class="memorial-story">${storyFromServer}</div>
            </div>
        `;

        const bookContainer = document.getElementById('memorial-book-container');
        bookContainer.innerHTML = storyHTML;

        document.getElementById('input-form').classList.add('hidden');
        bookContainer.classList.remove('hidden');
        document.getElementById('download-area').classList.remove('hidden');

        bookContainer.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Error:', error);
        alert('物語の生成中にエラーが発生しました。');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'AIにメモリアルブックの作成を依頼する';
    }
});

// Image preview logic
document.getElementById('car-photo').addEventListener('change', function() {
    const previewContainer = document.getElementById('image-preview');
    previewContainer.innerHTML = '';

    let files = Array.from(this.files);

    if (files.length > 3) {
        alert('添付できる画像は3枚までです。最初の3枚のみが選択されます。');
        files = files.slice(0, 3);
    }

    if (files.length === 0) {
        previewContainer.innerHTML = '<p style="color:#888; font-size:0.9em;">選択された画像はありません</p>';
        return;
    }

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            previewContainer.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
});

// PDF download logic (修正部分)
document.getElementById('download-pdf').addEventListener('click', function() {
    this.disabled = true;
    this.textContent = 'PDFを生成中...';

    // PDF化したい要素（表示されているメモリアルブック）を取得
    const element = document.getElementById('memorial-book-container');

    const title = document.querySelector('.memorial-title').textContent;

    const opt = {
        margin:       10, // マージンを10mmに設定
        filename:     `${title}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: 'avoid-all' } // コンテンツ内での改ページを避ける設定
    };
    
    html2pdf().set(opt).from(element).save().then(() => {
        this.disabled = false;
        this.textContent = 'PDFとしてダウンロード';
    }).catch(error => {
        console.error('PDF Download Error:', error);
        alert('PDFのダウンロードに失敗しました。');
        this.disabled = false;
        this.textContent = 'PDFとしてダウンロード';
    });
});