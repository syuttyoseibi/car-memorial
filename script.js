document.addEventListener('DOMContentLoaded', () => {
    // Global animation function
    const animateElements = (container) => {
        container.querySelectorAll('.fade-in, .slide-in-up, .scale-in, .text-reveal').forEach(element => {
            const delay = parseFloat(element.dataset.animationDelay) || 0;
            setTimeout(() => {
                element.classList.add('active');
            }, delay * 1000);
        });
    };

    // Global Intersection Observer for scroll-triggered animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe sections and content-sections for scroll-triggered animations
    document.querySelectorAll('section, .content-section').forEach(element => {
        element.classList.add('slide-in-up'); // Ensure animation class is present
        observer.observe(element);
    });

    // Page-specific logic for index.html
    if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        const introScreen = document.getElementById('intro-screen');
        const startButton = document.getElementById('start-button');
        const mainHeader = document.querySelector('header');
        const mainContent = document.querySelector('main');

        // Initially hide main content
        mainHeader.classList.add('hidden-initially');
        mainContent.classList.add('hidden-initially');

        // Animate intro screen elements on load
        animateElements(introScreen);

        startButton.addEventListener('click', () => {
            // Animate intro screen out
            introScreen.style.opacity = '0';
            introScreen.style.visibility = 'hidden';

            // After intro screen fades out, show and animate main content
            setTimeout(() => {
                introScreen.style.display = 'none'; // Remove from flow

                console.log('Transitioning to main content...');
                console.log('mainHeader before removal:', mainHeader.classList.contains('hidden-initially'));
                console.log('mainContent before removal:', mainContent.classList.contains('hidden-initially'));

                mainHeader.classList.remove('hidden-initially');
                mainContent.classList.remove('hidden-initially');
                document.getElementById('input-form').classList.remove('hidden-initially'); // Explicitly remove from input-form

                console.log('mainHeader after removal:', mainHeader.classList.contains('hidden-initially'));
                console.log('mainContent after removal:', mainContent.classList.contains('hidden-initially'));
                console.log('input-form after removal:', document.getElementById('input-form').classList.contains('hidden-initially'));

                // Trigger animations for main header and form
                animateElements(mainHeader);
                animateElements(mainContent);

                // Re-observe sections for scroll-triggered animations
                document.querySelectorAll('section').forEach(section => {
                    section.classList.remove('active'); // Reset active state if any
                    observer.observe(section);
                });

            }, 800); // Match intro screen fade-out duration
        });

        // Form submission logic (moved inside index.html specific block)
        document.getElementById('memorial-form').addEventListener('submit', async function(event) {
            event.preventDefault();

            const submitButton = event.target.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner"></span> AIが物語を生成中です...';

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

                const storyDiv = document.createElement('div');
                storyDiv.classList.add('memorial-story');
                storyDiv.textContent = storyFromServer; // Use textContent to sanitize

                const storyHTML = `
                    <div id="memorial-content">
                        <h2 class="memorial-title">${nickname}との物語</h2>
                        <p class="memorial-subtitle">君と走った道のりは、永遠に</p>
                        ${imagesHtml} <!-- Insert all images here -->
                        ${storyDiv.outerHTML} <!-- Insert sanitized story div -->
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
                submitButton.innerHTML = originalButtonText;
            }
        });

        // Image preview logic (moved inside index.html specific block)
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

            files.forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.classList.add('scale-in'); // Add animation class
                    previewContainer.appendChild(img);
                    // Trigger animation after a short delay
                    setTimeout(() => {
                        img.classList.add('active');
                    }, index * 100); // Staggered animation
                };
                reader.readAsDataURL(file);
            });
        });

        // Animate memorial book container on display (moved inside index.html specific block)
        const memorialBookContainer = document.getElementById('memorial-book-container');
        const memorialBookObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions); // Reuse the existing observerOptions

        memorialBookObserver.observe(memorialBookContainer);

        // Common download PDF logic (only if on index.html, otherwise it's handled globally)
        document.getElementById('download-pdf').addEventListener('click', async function() {
            window.print();
        });

    } else { // Logic for other pages
        // Initially hide main content on other pages
        document.querySelector('header').classList.add('hidden-initially');
        document.querySelector('main').classList.add('hidden-initially');

        // Animate header and main content on other pages
        animateElements(document.querySelector('header'));
        animateElements(document.querySelector('main'));

        // Common download PDF logic (for other pages)
        const downloadPdfButton = document.getElementById('download-pdf');
        if (downloadPdfButton) {
            downloadPdfButton.addEventListener('click', async function() {
                window.print();
            });
        }
    }
});