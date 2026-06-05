/* ==========================================================================
   HAI MATCHA - Interactive Scrollytelling Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // 1. Define Sequence Paths
    // ----------------------------------------------------
    const sequence1Paths = [];
    const frames1Count = 210;
    // Preparation Ritual (powder -> whisk -> milk)
    for (let i = 1; i <= frames1Count; i += 2) {
        const frameNum = String(i).padStart(3, '0');
        sequence1Paths.push(`2_extracted/ezgif-frame-${frameNum}.jpg`);
    }

    const sequence2Paths = [];
    const frames2Count = 220; // We stop at 220 to avoid the powder loop jump at the end of 1_extracted
    // Sensory Showcase (zoom out -> tilt -> steam rising -> zoom in top view)
    for (let i = 1; i <= frames2Count; i += 2) {
        const frameNum = String(i).padStart(3, '0');
        sequence2Paths.push(`1_extracted/ezgif-frame-${frameNum}.jpg`);
    }

    const allPaths = [...sequence1Paths, ...sequence2Paths];
    const totalImages = allPaths.length;
    let loadedCount = 0;
    const images = {};

    // ----------------------------------------------------
    // 2. Setup Canvas Elements
    // ----------------------------------------------------
    const ritualCanvas = document.getElementById('ritual-canvas');
    const ritualCtx = ritualCanvas.getContext('2d');
    const sensoryCanvas = document.getElementById('sensory-canvas');
    const sensoryCtx = sensoryCanvas.getContext('2d');

    // Canvas size management
    function resizeCanvas(canvas) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
    }

    function resizeAllCanvases() {
        resizeCanvas(ritualCanvas);
        resizeCanvas(sensoryCanvas);
        // Force redraw on resize if loaded
        if (loadedCount === totalImages) {
            drawCurrentFrames();
        }
    }

    window.addEventListener('resize', resizeAllCanvases);
    resizeAllCanvases();

    // ----------------------------------------------------
    // 3. Image Preloading & Progress Bar
    // ----------------------------------------------------
    function preloadAllImages(callback) {
        const loaderProgress = document.getElementById('loader-progress');
        const loaderLine = document.querySelector('.preloader-line');
        const preloader = document.getElementById('preloader');

        if (totalImages === 0) {
            preloader.style.opacity = '0';
            preloader.style.visibility = 'hidden';
            callback();
            return;
        }

        allPaths.forEach(path => {
            const img = new Image();
            img.src = path;
            img.onload = () => {
                loadedCount++;
                const percent = Math.round((loadedCount / totalImages) * 100);
                loaderProgress.textContent = `${percent}%`;
                loaderLine.style.width = `${percent}%`;

                if (loadedCount === totalImages) {
                    // Slight delay for premium feel
                    setTimeout(() => {
                        preloader.style.opacity = '0';
                        preloader.style.visibility = 'hidden';
                        callback();
                    }, 600);
                }
            };
            img.onerror = () => {
                console.warn(`Could not preload frame: ${path}. Continuing.`);
                loadedCount++;
                if (loadedCount === totalImages) {
                    preloader.style.opacity = '0';
                    preloader.style.visibility = 'hidden';
                    callback();
                }
            };
            images[path] = img;
        });
    }

    // ----------------------------------------------------
    // 4. Draw Frames (Object Fit Cover Implementation)
    // ----------------------------------------------------
    function drawImageOnCanvas(canvas, ctx, img) {
        if (!img || !img.complete) return;
        
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const imgRatio = img.width / img.height;
        const canvasRatio = canvasWidth / canvasHeight;

        let drawWidth, drawHeight, drawX, drawY;

        if (imgRatio > canvasRatio) {
            // Image is wider than canvas
            drawHeight = canvasHeight;
            drawWidth = canvasHeight * imgRatio;
            drawX = (canvasWidth - drawWidth) / 2;
            drawY = 0;
        } else {
            // Image is taller than canvas
            drawWidth = canvasWidth;
            drawHeight = canvasWidth / imgRatio;
            drawX = 0;
            drawY = (canvasHeight - drawHeight) / 2;
        }

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    }

    function drawCurrentFrames() {
        const frameIndex1 = Math.round(currentFrame1);
        const path1 = sequence1Paths[frameIndex1];
        if (images[path1]) drawImageOnCanvas(ritualCanvas, ritualCtx, images[path1]);

        const frameIndex2 = Math.round(currentFrame2);
        const path2 = sequence2Paths[frameIndex2];
        if (images[path2]) drawImageOnCanvas(sensoryCanvas, sensoryCtx, images[path2]);
    }

    // ----------------------------------------------------
    // 5. Scroll Interpolation & Control
    // ----------------------------------------------------
    const ritualContainer = document.getElementById('ritual-container');
    const sensoryContainer = document.getElementById('sensory-container');

    let targetFrame1 = 0;
    let currentFrame1 = 0;
    let targetFrame2 = 0;
    let currentFrame2 = 0;

    function updateScrollProgress() {
        // --- Section 1 (Ritual Canvas) ---
        const rect1 = ritualContainer.getBoundingClientRect();
        const totalHeight1 = ritualContainer.scrollHeight - window.innerHeight;
        // Check if container is in scroll view
        if (rect1.top <= 0 && rect1.bottom >= 0) {
            const scrolled1 = -rect1.top;
            const progress1 = Math.max(0, Math.min(1, scrolled1 / totalHeight1));
            targetFrame1 = progress1 * (sequence1Paths.length - 1);
        } else if (rect1.top > 0) {
            targetFrame1 = 0;
        } else if (rect1.bottom < 0) {
            targetFrame1 = sequence1Paths.length - 1;
        }

        // --- Section 2 (Sensory Canvas) ---
        const rect2 = sensoryContainer.getBoundingClientRect();
        const totalHeight2 = sensoryContainer.scrollHeight - window.innerHeight;
        // Check if container is in scroll view
        if (rect2.top <= 0 && rect2.bottom >= 0) {
            const scrolled2 = -rect2.top;
            const progress2 = Math.max(0, Math.min(1, scrolled2 / totalHeight2));
            targetFrame2 = progress2 * (sequence2Paths.length - 1);
        } else if (rect2.top > 0) {
            targetFrame2 = 0;
        } else if (rect2.bottom < 0) {
            targetFrame2 = sequence2Paths.length - 1;
        }
    }

    // ----------------------------------------------------
    // 6. Narrative Step Highlight Logic
    // ----------------------------------------------------
    const narrativeSteps = document.querySelectorAll('.narrative-step');

    function checkActiveSteps() {
        narrativeSteps.forEach(step => {
            const rect = step.getBoundingClientRect();
            const triggerPoint = window.innerHeight * 0.55;

            // Activate card when it crosses center viewport mark
            if (rect.top < triggerPoint && rect.bottom > triggerPoint - 150) {
                step.classList.add('active-step');
            } else {
                step.classList.remove('active-step');
            }
        });
    }

    // ----------------------------------------------------
    // 7. Navbar Scrolled Styling
    // ----------------------------------------------------
    const header = document.querySelector('.header');
    function checkHeaderScroll() {
        if (window.scrollY > 80) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    // ----------------------------------------------------
    // 8. Animation LERP Loop
    // ----------------------------------------------------
    let isInitialized = false;

    function renderLoop() {
        if (!isInitialized) return;

        // Smooth frame interpolation using LERP
        const lerpFactor = 0.12; // Lower value = smoother trailing animation
        
        const diff1 = targetFrame1 - currentFrame1;
        if (Math.abs(diff1) > 0.01) {
            currentFrame1 += diff1 * lerpFactor;
        } else {
            currentFrame1 = targetFrame1;
        }

        const diff2 = targetFrame2 - currentFrame2;
        if (Math.abs(diff2) > 0.01) {
            currentFrame2 += diff2 * lerpFactor;
        } else {
            currentFrame2 = targetFrame2;
        }

        // Draw current frames to canvases
        drawCurrentFrames();

        requestAnimationFrame(renderLoop);
    }

    // ----------------------------------------------------
    // 9. Initialize Website Interaction
    // ----------------------------------------------------
    preloadAllImages(() => {
        isInitialized = true;
        
        // Initial draw
        resizeAllCanvases();
        
        // Event Listeners
        window.addEventListener('scroll', () => {
            updateScrollProgress();
            checkActiveSteps();
            checkHeaderScroll();
        }, { passive: true });

        // Run render loop
        renderLoop();
    });
});
