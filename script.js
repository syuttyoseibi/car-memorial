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
        const storyFromServer = result.story; // This is raw HTML from the AI
        const nickname = formData.carNickname || formData.carName.split('・')[1] || formData.carName;

        // Store the raw story HTML for PDF generation
        document.body.setAttribute('data-story-html', storyFromServer);

        const photoInput = document.getElementById('car-photo');
        let filesToProcess = Array.from(photoInput.files);

        // Enforce 3-image limit also on submission, in case user bypassed change event
        if (filesToProcess.length > 3) {
            filesToProcess = filesToProcess.slice(0, 3);
        }

        const imageDataUrls = [];

        // Read all selected files as Data URLs
        const readers = filesToProcess.map(file => {
            return new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        });

        // Wait for all files to be read
        const allImageDataUrls = await Promise.all(readers);
        imageDataUrls.push(...allImageDataUrls);

        // Store all image data URLs in a single data attribute as a JSON string
        document.body.setAttribute('data-image-urls', JSON.stringify(imageDataUrls));

        // Build the HTML for display, including all images
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
                ${imagesHtml} <!-- Insert all images here -->
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
        alert('物語の生成中にエラーが発生しました。サーバーが起動しているか確認してください。');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'AIにメモリアルブックの作成を依頼する';
    }
});

// Image preview logic
document.getElementById('car-photo').addEventListener('change', function() {
    const previewContainer = document.getElementById('image-preview');
    previewContainer.innerHTML = ''; // Clear previous previews

    let files = Array.from(this.files);

    // Limit to 3 files
    if (files.length > 3) {
        alert('添付できる画像は3枚までです。最初の3枚のみが選択されます。');
        files = files.slice(0, 3); // Take only the first 3 files
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

document.getElementById('download-pdf').addEventListener('click', async function() {
    this.disabled = true;
    this.textContent = 'PDFを生成中...';

    try {
        const storyHtml = document.body.getAttribute('data-story-html');
        const imageDataUrls = JSON.parse(document.body.getAttribute('data-image-urls') || '[]');
        const title = document.querySelector('.memorial-title').textContent;
        const subtitle = document.querySelector('.memorial-subtitle').textContent;

        const printableHtml = `
            <!DOCTYPE html>
            <html lang="ja">
            <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                <style>
                    body { font-family: 'Noto Sans JP', sans-serif; margin: 1mm 15mm 5mm 15mm; line-height: 1.4; color: #333; font-size: 10pt; }
                    .memorial-content { margin-top: 0; }
                    .memorial-title { font-size: 1.8em; text-align: center; margin-top: 0; margin-bottom: 0.3em; color: #444; }
                    .memorial-subtitle { font-size: 1.0em; text-align: center; margin-top: 0; margin-bottom: 0.8em; color: #666; }
                    .memorial-story { margin-top: 1.5em; text-align: justify; }
                    .memorial-story p { margin-bottom: 0.8em; }
                    .highlight { color: #d9534f; font-weight: bold; }
                    .image-gallery-display { display: flex; justify-content: center; align-items: flex-start; flex-wrap: wrap; gap: 10px; margin-top: 1.5em; }
                    .memorial-photo { max-width: 30%; max-height: 30mm; height: auto; border: 1px solid #ddd; padding: 5px; box-sizing: border-box; object-fit: contain; }
                    @page { size: A4; margin: 1mm 15mm 5mm 15mm; }
                </style>
            </head>
            <body>
                <div class="memorial-content">
                    <h2 class="memorial-title">${title}</h2>
                    <p class="memorial-subtitle">${subtitle}</p>
                    ${imageDataUrls.length > 0 ? '<div class="image-gallery-display">' + imageDataUrls.map(url => `<img class="memorial-photo" src="${url}">`).join('') + '</div>' : ''}
                    <div class="memorial-story">${storyHtml}</div>
                </div>
            </body>
            </html>
        `;

                const opt = {
            margin:       [1, 10, 5, 10], // 下部マージンを減らす
            filename:     '愛車メモリアルブック.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, logging: true, dpi: 192, letterRendering: true, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        setTimeout(() => {
            html2pdf().set(opt).from(printableHtml).save().then(() => {
                this.disabled = false;
                this.textContent = 'PDFとしてダウンロード';
            });
        }, 100);

    } catch (error) {
        console.error('PDF Download Error:', error);
        alert('PDFのダウンロードに失敗しました。');
        this.disabled = false;
        this.textContent = 'PDFとしてダウンロード';
    }
});
